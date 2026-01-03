import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
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
import { 
  getMessMembers, 
  getUsers, 
  updateUser, 
  deleteUser,
  updateMess,
  getMessById,
} from '@/lib/storage';
import { User } from '@/types';
import { Users, UserPlus, Shield, Trash2, Mail, Phone, Crown } from 'lucide-react';

export default function Members() {
  const { user, refreshUser } = useAuth();
  const { toast } = useToast();
  const [members, setMembers] = useState<User[]>([]);
  const [pendingMembers, setPendingMembers] = useState<User[]>([]);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newMemberEmail, setNewMemberEmail] = useState('');

  const isManager = user?.role === 'manager';

  useEffect(() => {
    loadMembers();
  }, [user]);

  const loadMembers = () => {
    if (!user) return;
    
    const allUsers = getUsers().filter(u => u.messId === user.messId);
    setMembers(allUsers.filter(u => u.isApproved));
    setPendingMembers(allUsers.filter(u => !u.isApproved));
  };

  const handleApprove = (memberId: string) => {
    updateUser(memberId, { isApproved: true });
    loadMembers();
    toast({
      title: 'Member approved',
      description: 'The member can now access the mess.',
    });
  };

  const handleReject = (memberId: string) => {
    deleteUser(memberId);
    loadMembers();
    toast({
      title: 'Request rejected',
      description: 'The join request has been rejected.',
    });
  };

  const handleRemove = (memberId: string) => {
    deleteUser(memberId);
    loadMembers();
    toast({
      title: 'Member removed',
      description: 'The member has been removed from the mess.',
    });
  };

  const handleMakeManager = (memberId: string) => {
    if (!user) return;

    // Update the new manager
    updateUser(memberId, { role: 'manager' });
    
    // Update the mess manager ID
    const mess = getMessById(user.messId);
    if (mess) {
      updateMess(mess.id, { managerId: memberId });
    }
    
    // Demote current manager to member
    updateUser(user.id, { role: 'member' });
    
    refreshUser();
    loadMembers();
    
    toast({
      title: 'Manager changed',
      description: 'The member is now the manager of this mess.',
    });
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Members</h1>
            <p className="text-muted-foreground">
              {isManager ? 'Manage your mess members' : 'View all mess members'}
            </p>
          </div>
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
                  <div key={member.id} className="flex items-center justify-between p-4 bg-card rounded-lg border">
                    <div>
                      <p className="font-medium">{member.fullName}</p>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Mail className="h-3 w-3" /> {member.email}
                        </span>
                        <span className="flex items-center gap-1">
                          <Phone className="h-3 w-3" /> {member.phone}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => handleApprove(member.id)}>
                        Approve
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => handleReject(member.id)}>
                        Reject
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
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              Active Members ({members.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {members.length === 0 ? (
              <div className="text-center py-12">
                <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No members yet.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {members.map(member => (
                  <div key={member.id} className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <span className="text-primary font-semibold">
                          {member.fullName.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{member.fullName}</p>
                          {member.role === 'manager' && (
                            <Badge variant="default" className="text-xs">
                              <Crown className="h-3 w-3 mr-1" /> Manager
                            </Badge>
                          )}
                          {member.id === user?.id && (
                            <Badge variant="secondary" className="text-xs">You</Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Mail className="h-3 w-3" /> {member.email}
                          </span>
                          <span className="flex items-center gap-1">
                            <Phone className="h-3 w-3" /> {member.phone}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    {isManager && member.id !== user?.id && member.role !== 'manager' && (
                      <div className="flex gap-2">
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button size="sm" variant="outline">
                              <Shield className="h-4 w-4 mr-1" />
                              Make Manager
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
                              <AlertDialogAction onClick={() => handleMakeManager(member.id)}>
                                Confirm
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                        
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button size="sm" variant="destructive">
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
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
