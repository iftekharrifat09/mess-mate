import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { 
  getJoinRequests, 
  updateJoinRequest, 
  updateUser, 
  deleteJoinRequest,
  cleanupPendingJoinRequests,
  getUserById,
  getMesses
} from '@/lib/storage';
import { JoinRequest, User, Mess } from '@/types';
import { UserPlus, Mail, Phone, Check, X } from 'lucide-react';
import { Navigate } from 'react-router-dom';

interface PendingRequest extends JoinRequest {
  user: User;
}

export default function JoinRequests() {
  const { user, refreshUser } = useAuth();
  const { toast } = useToast();
  const [pendingRequests, setPendingRequests] = useState<PendingRequest[]>([]);

  const isManager = user?.role === 'manager';

  if (!isManager) {
    return <Navigate to="/dashboard" replace />;
  }

  useEffect(() => {
    loadPendingRequests();
  }, [user]);

  const loadPendingRequests = () => {
    if (!user) return;
    
    // Get pending join requests for this mess
    const requests = getJoinRequests().filter(
      r => r.messId === user.messId && r.status === 'pending'
    );
    
    // Get user details for each request
    const requestsWithUsers: PendingRequest[] = requests.map(r => {
      const requestUser = getUserById(r.userId);
      return {
        ...r,
        user: requestUser!
      };
    }).filter(r => r.user); // Filter out requests where user doesn't exist
    
    setPendingRequests(requestsWithUsers);
  };

  const handleApprove = (request: PendingRequest) => {
    // Update join request status
    updateJoinRequest(request.id, { status: 'approved' });
    
    // Update user's messId and approval status
    updateUser(request.userId, { 
      messId: user!.messId, 
      isApproved: true 
    });
    
    // Clean up all other pending join requests for this user
    cleanupPendingJoinRequests(request.userId, user!.messId);
    
    loadPendingRequests();
    toast({
      title: 'Member approved',
      description: `${request.user.fullName} can now access the mess.`,
    });
  };

  const handleReject = (request: PendingRequest) => {
    // Update join request status
    updateJoinRequest(request.id, { status: 'rejected' });
    
    loadPendingRequests();
    toast({
      title: 'Request rejected',
      description: 'The join request has been rejected.',
    });
  };

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
