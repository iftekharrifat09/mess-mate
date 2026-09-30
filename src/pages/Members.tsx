import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import * as dataService from '@/lib/dataService';
import * as api from '@/lib/api';
import { User } from '@/types';
import { Users, UserPlus, Shield, Trash2, Mail, Phone, Crown, Loader2 } from 'lucide-react';
import ManagerMealRateCard from '@/components/members/ManagerMealRateCard';
import ServiceSettingDialog from '@/components/members/ServiceSettingDialog';
import { getServiceStatus, serviceLabel } from '@/lib/serviceStatus';
import { ServiceStatus } from '@/types';
import { Settings2 } from 'lucide-react';

export default function Members() {
  const { user, refreshUser } = useAuth();
  const { toast } = useToast();
  const [members, setMembers] = useState<User[]>([]);
  const [pendingMembers, setPendingMembers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [promotingId, setPromotingId] = useState<string | null>(null);
  const [serviceOpen, setServiceOpen] = useState(false);

  const isManager = user?.role === 'manager';

  useEffect(() => {
    loadMembers();
  }, [user]);

  const loadMembers = async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      // Fetch members directly from the mess (backend supported)
      const messUsers = await dataService.getMessMembers(user.messId);
      setMembers(messUsers.filter(u => u.isApproved));
      setPendingMembers(messUsers.filter(u => !u.isApproved));
    } catch (error) {
      console.error('Error loading members:', error);
      toast({
        title: 'Error',
        description: 'Failed to load members',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleApprove = async (memberId: string) => {
    if (approvingId) return;
    setApprovingId(memberId);
    try {
      await dataService.updateUser(memberId, { isApproved: true });
      loadMembers();
      toast({ title: 'Member approved', description: 'The member can now access the mess.', variant: 'success' });
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to approve member', variant: 'destructive' });
    } finally {
      setApprovingId(null);
    }
  };

  const handleReject = async (memberId: string) => {
    if (rejectingId) return;
    setRejectingId(memberId);
    try {
      await dataService.deleteUser(memberId);
      loadMembers();
      toast({ title: 'Request rejected', description: 'The join request has been rejected.', variant: 'success' });
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to reject request', variant: 'destructive' });
    } finally {
      setRejectingId(null);
    }
  };

  const handleRemove = async (memberId: string) => {
    if (removingId || !user) return;
    setRemovingId(memberId);
    try {
      const memberToRemove = members.find(m => m.id === memberId);
      await dataService.deleteUser(memberId);
      if (memberToRemove) {
        await dataService.createActivityLog({
          messId: user.messId,
          type: 'member_removed',
          description: `${memberToRemove.fullName} was removed from the mess`,
          metadata: { removedDate: new Date().toISOString() },
        });
      }
      loadMembers();
      toast({ title: 'Member removed', description: 'The member has been removed from the mess.', variant: 'success' });
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to remove member', variant: 'destructive' });
    } finally {
      setRemovingId(null);
    }
  };

  const handleMakeManager = async (memberId: string) => {
    if (!user || promotingId) return;
    setPromotingId(memberId);
    try {
      const newManager = members.find(m => m.id === memberId);
      const result = await api.makeManagerAPI(memberId);
      if (!result.success) throw new Error(result.error || 'Failed to change manager');
      if (newManager) {
        await dataService.createActivityLog({
          messId: user.messId,
          type: 'manager_change',
          description: `Manager changed from ${user.fullName} to ${newManager.fullName}`,
        });
      }
      refreshUser();
      loadMembers();
      toast({ title: 'Manager changed', description: 'The member is now the manager of this mess.', variant: 'success' });
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to change manager', variant: 'destructive' });
    } finally {
      setPromotingId(null);
    }
  };

  const handleServiceSubmit = async (ids: string[], status: ServiceStatus) => {
    if (!user) return;
    try {
      await dataService.updateMembersServiceStatus(user.messId, ids, status);
      setMembers(prev => prev.map(m => (ids.includes(m.id) ? { ...m, serviceStatus: status } : m)));
      toast({ title: 'Service updated', description: `${ids.length} member(s) set to ${serviceLabel(status)}.`, variant: 'success' });
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to update service status', variant: 'destructive' });
      throw error;
    }
  };

  const serviceBadgeClass = (s: ServiceStatus) =>
    s === 'meals_only' ? 'border-primary/40 text-primary' : s === 'expenses_only' ? 'border-warning/50 text-warning' : 'border-success/40 text-success';

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Members</h1>
            <p className="text-muted-foreground">
              {isManager ? 'Manage your mess members' : 'View all mess members'}
            </p>
          </div>
          {isManager && (
            <Button size="sm" variant="outline" onClick={() => setServiceOpen(true)}>
              <Settings2 className="h-4 w-4 sm:mr-1" />
              <span className="hidden sm:inline">Member's Service Setting</span>
            </Button>
          )}
        </div>

        {/* Pending Requests - Manager Only */}
        {isManager && pendingMembers.length > 0 && (
          <Card className="border-warning/20 bg-warning/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <UserPlus className="h-5 w-5 text-warning" />
                Pending Requests ({pendingMembers.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {pendingMembers.map(member => (
                  <div key={member.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-card rounded-lg border">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium truncate">{member.fullName}</p>
                      <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1 truncate">
                          <Mail className="h-3 w-3 flex-shrink-0" /> <span className="truncate">{member.email}</span>
                        </span>
                        <span className="flex items-center gap-1">
                          <Phone className="h-3 w-3 flex-shrink-0" /> {member.phone}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      <Button size="sm" onClick={() => handleApprove(member.id)} disabled={approvingId === member.id} className="flex-1 sm:flex-initial">
                        {approvingId === member.id ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Approve'}
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => handleReject(member.id)} disabled={rejectingId === member.id} className="flex-1 sm:flex-initial">
                        {rejectingId === member.id ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Reject'}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Active Members */}
        <Card>
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="flex items-center gap-2 text-xl sm:text-2xl">
              <Users className="h-5 w-5 text-primary" />
              Active Members ({members.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="px-3 pb-3 sm:px-6 sm:pb-6">
            {members.length === 0 ? (
              <div className="text-center py-12">
                <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No members yet.</p>
              </div>
            ) : (
              <div className="grid gap-3">
                {members.map(member => (
                  <div key={member.id} className="grid gap-4 rounded-lg border border-border/60 bg-muted/30 p-4 transition-colors hover:bg-muted/50 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full border border-border bg-background shadow-sm">
                        <span className="text-sm font-semibold text-foreground">
                          {member.fullName.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <p className="max-w-full break-words font-semibold leading-tight">{member.fullName}</p>
                          {member.role === 'manager' && (
                            <Badge variant="default" className="text-xs flex-shrink-0">
                              <Crown className="h-3 w-3 mr-1" /> Manager
                            </Badge>
                          )}
                          {member.id === user?.id && (
                            <Badge variant="secondary" className="text-xs flex-shrink-0">You</Badge>
                          )}
                        </div>
                        <div className="mt-1.5 flex flex-col gap-1 text-xs text-muted-foreground sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-4">
                          <span className="flex min-w-0 items-center gap-1.5">
                            <Mail className="h-3.5 w-3.5 flex-shrink-0" /> <span className="break-all">{member.email}</span>
                          </span>
                          <span className="flex items-center gap-1.5">
                            <Phone className="h-3.5 w-3.5 flex-shrink-0" /> {member.phone}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-end justify-between gap-3 border-t border-border/60 pt-3 lg:justify-end lg:border-0 lg:pt-0">
                    <div className="flex min-w-0 flex-col items-start lg:items-end">
                      <span className="text-[10px] font-medium uppercase text-muted-foreground">Service</span>
                      <Badge variant="outline" className={`mt-1 max-w-full text-xs ${serviceBadgeClass(getServiceStatus(member))}`}>
                        {serviceLabel(getServiceStatus(member))}
                      </Badge>
                    </div>
                    {isManager && member.id !== user?.id && member.role !== 'manager' && (
                      <div className="flex flex-shrink-0 gap-2">
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button size="sm" variant="outline" className="hidden sm:inline-flex">
                              <Shield className="h-4 w-4 mr-1" />
                              Make Manager
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogTrigger asChild>
                            <Button size="icon" variant="outline" className="h-9 w-9 sm:hidden" aria-label={`Make ${member.fullName} manager`} title="Make manager">
                              <Shield className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Transfer Manager Role?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This will make {member.fullName} the new manager. You will become a regular member.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleMakeManager(member.id)} disabled={promotingId === member.id}>
                                {promotingId === member.id ? 'Processing...' : 'Confirm'}
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                        
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button size="icon" variant="destructive" className="h-9 w-9" aria-label={`Remove ${member.fullName}`} title="Remove member">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Remove Member?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This will remove {member.fullName} from the mess. This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleRemove(member.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                                Remove
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
        <ServiceSettingDialog open={serviceOpen} onOpenChange={setServiceOpen} members={members} onSubmit={handleServiceSubmit} />
        {/* Manager & Meal Rate Graph */}
        {user?.messId && (
          <ManagerMealRateCard messId={user.messId} members={members} />
        )}
      </div>
    </DashboardLayout>
  );
}
