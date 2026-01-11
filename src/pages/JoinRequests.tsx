import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import * as dataService from '@/lib/dataService';
import { JoinRequest, User } from '@/types';
import { UserPlus, Mail, Phone, Check, X, Loader2 } from 'lucide-react';
import { Navigate } from 'react-router-dom';

interface PendingRequest extends JoinRequest {
  user: User;
}

export default function JoinRequests() {
  const { user, refreshUser } = useAuth();
  const { toast } = useToast();
  const [pendingRequests, setPendingRequests] = useState<PendingRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const isManager = user?.role === 'manager';

  useEffect(() => {
    if (isManager) {
      loadPendingRequests();
    }
  }, [user, isManager]);

  if (!isManager) {
    return <Navigate to="/dashboard" replace />;
  }

  const loadPendingRequests = async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      // Get pending join requests for this mess
      const requests = await dataService.getJoinRequests();
      const pendingForMess = requests.filter(
        r => r.messId === user.messId && r.status === 'pending'
      );
      
      // Get user details for each request
      const requestsWithUsers: PendingRequest[] = [];
      for (const r of pendingForMess) {
        const requestUser = await dataService.getUserById(r.userId);
        if (requestUser) {
          requestsWithUsers.push({ ...r, user: requestUser });
        }
      }
      
      setPendingRequests(requestsWithUsers);
    } catch (error) {
      console.error('Error loading pending requests:', error);
      toast({
        title: 'Error',
        description: 'Failed to load pending requests',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleApprove = async (request: PendingRequest) => {
    if (!user) return;
    
    try {
      await dataService.approveJoinRequest(request.id);
      
      loadPendingRequests();
      toast({
        title: 'Member approved',
        description: `${request.user.fullName} can now access the mess.`,
      });
    } catch (error) {
      console.error('Error approving request:', error);
      toast({
        title: 'Error',
        description: 'Failed to approve request',
        variant: 'destructive',
      });
    }
  };

  const handleReject = async (request: PendingRequest) => {
    try {
      await dataService.rejectJoinRequest(request.id);
      
      loadPendingRequests();
      toast({
        title: 'Request rejected',
        description: 'The join request has been rejected.',
      });
    } catch (error) {
      console.error('Error rejecting request:', error);
      toast({
        title: 'Error',
        description: 'Failed to reject request',
        variant: 'destructive',
      });
    }
  };

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
        <div>
          <h1 className="text-3xl font-bold text-foreground">Join Requests</h1>
          <p className="text-muted-foreground">Manage pending member requests</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-primary" />
              Pending Requests ({pendingRequests.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {pendingRequests.length === 0 ? (
              <div className="text-center py-12">
                <UserPlus className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No pending requests.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {pendingRequests.map(request => (
                  <div 
                    key={request.id} 
                    className="flex items-center justify-between p-4 bg-muted/30 rounded-lg border"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                        <span className="text-primary font-semibold text-lg">
                          {request.user.fullName.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium text-foreground">{request.user.fullName}</p>
                        <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Mail className="h-3 w-3" /> {request.user.email}
                          </span>
                          {request.user.phone && (
                            <span className="flex items-center gap-1">
                              <Phone className="h-3 w-3" /> {request.user.phone}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          Requested: {new Date(request.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        size="sm" 
                        className="gradient-accent"
                        onClick={() => handleApprove(request)}
                      >
                        <Check className="h-4 w-4 mr-1" />
                        Approve
                      </Button>
                      <Button 
                        size="sm" 
                        variant="destructive"
                        onClick={() => handleReject(request)}
                      >
                        <X className="h-4 w-4 mr-1" />
                        Reject
                      </Button>
                    </div>
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
