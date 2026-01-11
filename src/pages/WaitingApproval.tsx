import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Utensils, Clock, ArrowLeft, RefreshCw, Loader2 } from 'lucide-react';
import * as dataService from '@/lib/dataService';
import { useAuth } from '@/contexts/AuthContext';
import { Mess } from '@/types';

export default function WaitingApproval() {
  const navigate = useNavigate();
  const { user, refreshUser, logout } = useAuth();
  const [pendingMesses, setPendingMesses] = useState<Mess[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (user) {
      // If user is already approved and has messId, redirect to dashboard
      if (user.isApproved && user.messId) {
        navigate('/dashboard');
        return;
      }
      loadPendingRequests();
    }
  }, [user]);

  const loadPendingRequests = async () => {
    if (!user) return;
    setIsLoading(true);
    
    try {
      const requests = await dataService.getJoinRequestsByUserId(user.id);
      const pendingRequests = requests.filter(r => r.status === 'pending');
      
      const messes: Mess[] = [];
      for (const r of pendingRequests) {
        const mess = await dataService.getMessById(r.messId);
        if (mess) {
          messes.push(mess);
        }
      }
      setPendingMesses(messes);
    } catch (error) {
      console.error('Error loading pending requests:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    
    try {
      // Refresh user data from backend
      await refreshUser();
      
      // Small delay to allow state to update
      setTimeout(() => {
        // Check if user has been approved after refresh
        // The refreshUser will update the user state, so we check on next render
        loadPendingRequests();
        setIsRefreshing(false);
      }, 500);
    } catch (error) {
      console.error('Error refreshing user:', error);
      setIsRefreshing(false);
    }
  };

  // Check if user is now approved after state updates
  useEffect(() => {
    if (user?.isApproved && user?.messId) {
      navigate('/dashboard');
    }
  }, [user?.isApproved, user?.messId]);

  const handleLogout = () => {
    logout();
    navigate('/auth');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md animate-fade-in">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl gradient-primary mb-4">
            <Utensils className="w-8 h-8 text-primary-foreground" />
          </div>
          <h1 className="text-3xl font-bold text-foreground">Mess Manager</h1>
          <p className="text-muted-foreground mt-2">Waiting for approval</p>
        </div>

        <Card className="shadow-card">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 rounded-full bg-warning/10 flex items-center justify-center mb-4">
              <Clock className="w-8 h-8 text-warning" />
            </div>
            <CardTitle>Request Pending</CardTitle>
            <CardDescription>
              Your join request is pending approval. Please contact the mess manager.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoading ? (
              <div className="flex justify-center py-4">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : pendingMesses.length > 0 ? (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground text-center">
                  Pending requests for:
                </p>
                {pendingMesses.map(mess => (
                  <div 
                    key={mess.id}
                    className="p-3 bg-muted/50 rounded-lg border text-center"
                  >
                    <p className="font-medium text-foreground">{mess.name}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-4">
                <p className="text-sm text-muted-foreground">No pending requests found.</p>
                <p className="text-xs text-muted-foreground mt-1">Try joining a mess first.</p>
              </div>
            )}

            <Button 
              onClick={handleRefresh}
              variant="outline"
              className="w-full"
              disabled={isRefreshing}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
              {isRefreshing ? 'Checking...' : 'Check Status'}
            </Button>

            <div className="flex gap-3">
              <Button 
                onClick={() => navigate('/join-mess')}
                variant="outline"
                className="flex-1"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Join Another
              </Button>
              <Button 
                onClick={handleLogout}
                variant="ghost"
                className="flex-1"
              >
                Logout
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
