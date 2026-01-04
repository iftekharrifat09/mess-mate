import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { PasswordInput } from '@/components/ui/password-input';
import { useToast } from '@/hooks/use-toast';
import { Utensils, Mail, User, Phone, Building, LogIn, UserPlus } from 'lucide-react';
import { cn } from '@/lib/utils';

type AuthMode = 'login' | 'signup';
type RoleType = 'member' | 'manager';

export default function Auth() {
  const [mode, setMode] = useState<AuthMode>('login');
  const [role, setRole] = useState<RoleType>('member');
  const [isLoading, setIsLoading] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  
  // Form fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [messName, setMessName] = useState('');
  
  const { login, registerManager, registerMember } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const resetForm = () => {
    setEmail('');
    setPassword('');
    setFullName('');
    setPhone('');
    setMessName('');
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const result = await login(email, password);

    if (result.success) {
      toast({
        title: 'Welcome back!',
        description: 'You have successfully logged in.',
      });
      navigate('/dashboard');
    } else {
      toast({
        title: 'Login failed',
        description: result.error,
        variant: 'destructive',
      });
    }

    setIsLoading(false);
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    if (role === 'manager') {
      const result = await registerManager({
        fullName,
        messName,
        phone,
        email,
        password,
      });

      if (result.success) {
        toast({
          title: 'Account created!',
          description: 'Your mess has been created. Welcome!',
        });
        navigate('/dashboard');
      } else {
        toast({
          title: 'Registration failed',
          description: result.error,
          variant: 'destructive',
        });
      }
    } else {
      // Member signup - just create account, then redirect to join mess
      const result = await registerMember({
        fullName,
        phone,
        email,
        password,
        messId: '', // Will join mess later
      });

      if (result.success) {
        toast({
          title: 'Account created!',
          description: 'Now find and join a mess.',
        });
        navigate('/join-mess', { state: { email } });
      } else {
        toast({
          title: 'Registration failed',
          description: result.error,
          variant: 'destructive',
        });
      }
    }

    setIsLoading(false);
  };

  const handleForgotPassword = (e: React.FormEvent) => {
    e.preventDefault();
    // In a real app, this would send a reset email
    toast({
      title: 'Password Reset',
      description: 'If an account exists with this email, you will receive a password reset link.',
    });
    setShowForgotPassword(false);
  };

  if (showForgotPassword) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="w-full max-w-md animate-fade-in">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl gradient-primary mb-4">
              <Utensils className="w-8 h-8 text-primary-foreground" />
            </div>
            <h1 className="text-3xl font-bold text-foreground">Mess Manager</h1>
            <p className="text-muted-foreground mt-2">Reset your password</p>
          </div>

          <Card className="shadow-card">
            <CardContent className="pt-6">
              <form onSubmit={handleForgotPassword} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="reset-email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="reset-email"
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10"
                      required
                    />
                  </div>
                </div>

                <Button type="submit" className="w-full gradient-primary">
                  Send Reset Link
                </Button>

                <Button
                  type="button"
                  variant="ghost"
                  className="w-full"
                  onClick={() => setShowForgotPassword(false)}
                >
                  Back to Login
                </Button>
              </form>
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
          <h1 className="text-3xl font-bold text-foreground">Mess Manager</h1>
          <p className="text-muted-foreground mt-2">Manage your mess efficiently</p>
        </div>

        <Card className="shadow-card">
          <CardContent className="pt-6">
            {/* Login/Signup Tabs */}
            <div className="flex bg-muted rounded-lg p-1 mb-6">
              <button
                type="button"
                onClick={() => {
                  setMode('login');
                  resetForm();
                }}
                className={cn(
                  'flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-sm font-medium transition-colors',
                  mode === 'login'
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <LogIn className="w-4 h-4" />
                Login
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode('signup');
                  resetForm();
                }}
                className={cn(
                  'flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-sm font-medium transition-colors',
                  mode === 'signup'
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <UserPlus className="w-4 h-4" />
                Sign Up
              </button>
            </div>

            {mode === 'login' ? (
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <PasswordInput
                      id="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-3"
                      required
                    />
                  </div>
                </div>

                <div className="text-right">
                  <button
                    type="button"
                    onClick={() => setShowForgotPassword(true)}
                    className="text-sm text-primary hover:underline"
                  >
                    Forgot password?
                  </button>
                </div>

                <Button type="submit" className="w-full gradient-primary" disabled={isLoading}>
                  {isLoading ? 'Signing in...' : 'Sign In'}
                </Button>
              </form>
            ) : (
              <form onSubmit={handleSignup} className="space-y-4">
                {/* Role Selection */}
                <div className="space-y-2">
                  <Label className="text-muted-foreground">I want to register as:</Label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setRole('member')}
                      className={cn(
                        'flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all',
                        role === 'member'
                          ? 'border-primary bg-primary text-primary-foreground'
                          : 'border-border hover:border-primary/50'
                      )}
                    >
                      <UserPlus className="w-6 h-6" />
                      <div className="text-center">
                        <p className="font-medium">Member</p>
                        <p className={cn(
                          'text-xs',
                          role === 'member' ? 'text-primary-foreground/80' : 'text-muted-foreground'
                        )}>
                          Join existing mess
                        </p>
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => setRole('manager')}
                      className={cn(
                        'flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all',
                        role === 'manager'
                          ? 'border-primary bg-primary text-primary-foreground'
                          : 'border-border hover:border-primary/50'
                      )}
                    >
                      <Building className="w-6 h-6" />
                      <div className="text-center">
                        <p className="font-medium">Manager</p>
                        <p className={cn(
                          'text-xs',
                          role === 'manager' ? 'text-primary-foreground/80' : 'text-muted-foreground'
                        )}>
                          Create new mess
                        </p>
                      </div>
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="fullName">Full Name</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="fullName"
                      type="text"
                      placeholder="John Doe"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="pl-10"
                      required
                    />
                  </div>
                </div>

                {role === 'manager' && (
                  <div className="space-y-2">
                    <Label htmlFor="messName">Mess Name</Label>
                    <div className="relative">
                      <Building className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="messName"
                        type="text"
                        placeholder="My Awesome Mess"
                        value={messName}
                        onChange={(e) => setMessName(e.target.value)}
                        className="pl-10"
                        required
                      />
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="signupEmail">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="signupEmail"
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number (Optional)</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="+1234567890"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signupPassword">Password</Label>
                  <PasswordInput
                    id="signupPassword"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>

                <Button type="submit" className="w-full gradient-primary" disabled={isLoading}>
                  {isLoading ? 'Creating account...' : role === 'manager' ? 'Create Mess & Account' : 'Create Account'}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
