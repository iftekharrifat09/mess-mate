import { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Utensils, Search, ArrowLeft, Check } from 'lucide-react';
import { getMesses, createJoinRequest, getJoinRequests, getUserByEmail, updateUser } from '@/lib/storage';
import { Mess } from '@/types';

export default function JoinMess() {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Mess[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [requestedMessIds, setRequestedMessIds] = useState<string[]>([]);
  
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  
  const userEmail = location.state?.email;

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    
    const messes = getMesses();
    const query = searchQuery.toLowerCase().trim();
    
    // Search by mess code (ID) or name
    const results = messes.filter(mess => 
      mess.id.toLowerCase().includes(query) ||
      mess.name.toLowerCase().includes(query)
    );
    
    setSearchResults(results);
    setHasSearched(true);
  };

  const handleJoinRequest = (mess: Mess) => {
    if (!userEmail) {
      toast({
        title: 'Error',
        description: 'Please sign up first.',
        variant: 'destructive',
      });
      navigate('/auth');
      return;
    }

    const user = getUserByEmail(userEmail);
    if (!user) {
      toast({
        title: 'Error',
        description: 'User not found. Please sign up again.',
        variant: 'destructive',
      });
      navigate('/auth');
      return;
    }

    // Check if already requested
    const existingRequests = getJoinRequests();
    const alreadyRequested = existingRequests.some(
      r => r.userId === user.id && r.messId === mess.id && r.status === 'pending'
    );

    if (alreadyRequested) {
      toast({
        title: 'Already Requested',
        description: 'You have already sent a join request to this mess.',
        variant: 'destructive',
      });
      return;
    }

    // Update user's messId and create join request
    updateUser(user.id, { messId: mess.id });
    
    createJoinRequest({
      messId: mess.id,
      userId: user.id,
      status: 'pending',
    });

    setRequestedMessIds(prev => [...prev, mess.id]);

    toast({
      title: 'Request Sent!',
      description: `Your request to join "${mess.name}" has been sent. Please wait for manager approval.`,
    });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md animate-fade-in">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl gradient-primary mb-4">
            <Utensils className="w-8 h-8 text-primary-foreground" />
          </div>
          <h1 className="text-3xl font-bold text-foreground">Join a Mess</h1>
          <p className="text-muted-foreground mt-2">Search and request to join</p>
        </div>

        <Card className="shadow-card">
          <CardHeader>
            <CardTitle>Find Your Mess</CardTitle>
            <CardDescription>
              Search by mess name or code to find and join your mess.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSearch} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="search">Mess Name or Code</Label>
                <div className="flex gap-2">
                  <Input
                    id="search"
                    type="text"
                    placeholder="Enter mess name or code..."
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

            {hasSearched && (
              <div className="mt-6 space-y-3">
                {searchResults.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">No mess found with that name or code.</p>
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
                        <p className="text-xs text-muted-foreground">Code: {mess.id.slice(0, 8)}</p>
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

            <div className="mt-6 text-center">
              <Link
                to="/auth"
                className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Login
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
