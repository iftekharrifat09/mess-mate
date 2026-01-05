import { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Utensils, Search, ArrowLeft, Check, AlertCircle } from 'lucide-react';
import { 
  getMesses, 
  createJoinRequest, 
  getJoinRequests, 
  getUserById,
  getMessByCode,
  getPendingJoinRequestsForUser,
  updateUser
} from '@/lib/storage';
import { Mess, User } from '@/types';
import { useAuth } from '@/contexts/AuthContext';

export default function JoinMess() {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Mess[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [requestedMessIds, setRequestedMessIds] = useState<string[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isPartOfMess, setIsPartOfMess] = useState(false);
  
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { user: authUser } = useAuth();
  
  const userId = location.state?.userId || authUser?.id;
  const userEmail = location.state?.email || authUser?.email;

  useEffect(() => {
    if (userId) {
      const user = getUserById(userId);
      setCurrentUser(user || null);
      
      // Check if user is already part of a mess
      if (user?.messId && user?.isApproved) {
        setIsPartOfMess(true);
      }
      
      // Load existing pending requests
      if (user) {
        const pendingRequests = getPendingJoinRequestsForUser(user.id);
        setRequestedMessIds(pendingRequests.map(r => r.messId));
      }
    }
  }, [userId]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    
    const messes = getMesses();
    const query = searchQuery.trim();
    
    // Search by mess code first, then by name
    const byCode = getMessByCode(query);
    if (byCode) {
      setSearchResults([byCode]);
      setHasSearched(true);
      return;
    }
    
    // Search by name
    const results = messes.filter(mess => 
      mess.name.toLowerCase().includes(query.toLowerCase()) ||
      mess.messCode?.toLowerCase().includes(query.toLowerCase())
    );
    
    setSearchResults(results);
    setHasSearched(true);
  };

  const handleJoinRequest = (mess: Mess) => {
    if (!currentUser) {
      toast({
        title: 'Error',
        description: 'Please sign up first.',
        variant: 'destructive',
      });
      navigate('/auth');
      return;
    }

    // Check if already part of a mess
    if (isPartOfMess) {
      toast({
        title: 'Already a Member',
        description: 'You are already a member of a mess. Leave your current mess first.',
        variant: 'destructive',
      });
      return;
    }

    // Check if already requested
    const existingRequests = getJoinRequests();
    const alreadyRequested = existingRequests.some(
      r => r.userId === currentUser.id && r.messId === mess.id && r.status === 'pending'
    );

    if (alreadyRequested) {
      toast({
        title: 'Already Requested',
        description: 'You have already sent a join request to this mess.',
        variant: 'destructive',
      });
      return;
    }

    // Create join request (don't update messId until approved)
    createJoinRequest({
      messId: mess.id,
      userId: currentUser.id,
      status: 'pending',
    });

    setRequestedMessIds(prev => [...prev, mess.id]);

    toast({
      title: 'Request Sent!',
      description: `Your request to join "${mess.name}" has been sent. Please wait for manager approval.`,
    });
  };

  if (isPartOfMess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="w-full max-w-md animate-fade-in">
          <Card className="shadow-card">
            <CardContent className="pt-6 text-center">
              <AlertCircle className="h-12 w-12 text-warning mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">Already a Member</h2>
              <p className="text-muted-foreground mb-4">
                You are already a member of a mess. You cannot join another mess while being part of one.
              </p>
              <Button onClick={() => navigate('/dashboard')} className="gradient-primary">
                Go to Dashboard
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md animate-fade-in">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl gradient-primary mb-4">
            <Utensils className="w-8 h-8 text-primary-foreground" />
          </div>
          <h1 className="text-3xl font-bold text-foreground">Join a Mess</h1>
          <p className="text-muted-foreground mt-2">Search by mess code or name</p>
        </div>

        <Card className="shadow-card">
          <CardHeader>
            <CardTitle>Find Your Mess</CardTitle>
            <CardDescription>
              Enter the mess code provided by your manager to join their mess.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSearch} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="search">Mess Code or Name</Label>
                <div className="flex gap-2">
                  <Input
                    id="search"
                    type="text"
                    placeholder="e.g., ABC123 or My Mess"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    required
                  />
                  <Button type="submit" className="gradient-primary">
                    <Search className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </form>

            {requestedMessIds.length > 0 && !hasSearched && (
              <div className="mt-4 p-3 bg-info/10 border border-info/20 rounded-lg">
                <p className="text-sm text-info">
                  You have {requestedMessIds.length} pending join request(s).
                </p>
              </div>
            )}

            {hasSearched && (
              <div className="mt-6 space-y-3">
                {searchResults.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">No mess found with that code or name.</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Ask your mess manager for the correct code.
                    </p>
                  </div>
                ) : (
                  searchResults.map(mess => (
                    <div
                      key={mess.id}
                      className="flex items-center justify-between p-4 bg-muted/50 rounded-lg border"
                    >
                      <div>
                        <p className="font-medium text-foreground">{mess.name}</p>
                        <p className="text-xs text-muted-foreground">Code: {mess.messCode}</p>
                      </div>
                      {requestedMessIds.includes(mess.id) ? (
                        <Button disabled variant="outline" size="sm">
                          <Check className="h-4 w-4 mr-1" />
                          Requested
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          className="gradient-primary"
                          onClick={() => handleJoinRequest(mess)}
                        >
                          Join Request
                        </Button>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}

            <div className="mt-6 flex justify-between">
              <Link
                to="/auth"
                className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Login
              </Link>
              {requestedMessIds.length > 0 && (
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => navigate('/waiting-approval')}
                >
                  Check Status
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
