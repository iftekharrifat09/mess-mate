import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { getUsers, updateUser, deleteUser } from '@/lib/storage';
import { User } from '@/types';
import { UserPlus, Mail, Phone, Check, X } from 'lucide-react';
import { Navigate } from 'react-router-dom';

export default function JoinRequests() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [pendingMembers, setPendingMembers] = useState<User[]>([]);

  const isManager = user?.role === 'manager';

  if (!isManager) {
    return <Navigate to="/dashboard" replace />;
  }

  useEffect(() => {
    loadPendingRequests();
  }, [user]);

  const loadPendingRequests = () => {
    if (!user) return;
    
    const allUsers = getUsers().filter(u => u.messId === user.messId && !u.isApproved);
    setPendingMembers(allUsers);
  };

  const handleApprove = (memberId: string) => {
    updateUser(memberId, { isApproved: true });
    loadPendingRequests();
    toast({
      title: 'Member approved',
      description: 'The member can now access the mess.',
    });
  };

  const handleReject = (memberId: string) => {
    deleteUser(memberId);
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
              Pending Requests ({pendingMembers.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {pendingMembers.length === 0 ? (
              <div className="text-center py-12">
                <UserPlus className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No pending requests.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {pendingMembers.map(member => (
                  <div 
                    key={member.id} 
                    className="flex items-center justify-between p-4 bg-muted/30 rounded-lg border"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                        <span className="text-primary font-semibold text-lg">
                          {member.fullName.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium text-foreground">{member.fullName}</p>
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
                    <div className="flex gap-2">
                      <Button 
                        size="sm" 
                        className="gradient-accent"
                        onClick={() => handleApprove(member.id)}
                      >
                        <Check className="h-4 w-4 mr-1" />
                        Approve
                      </Button>
                      <Button 
                        size="sm" 
                        variant="destructive"
                        onClick={() => handleReject(member.id)}
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
