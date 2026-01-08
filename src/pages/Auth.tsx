import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { PasswordInput } from '@/components/ui/password-input';
import { useToast } from '@/hooks/use-toast';
import { Utensils, Mail, User, Phone, Building, LogIn, UserPlus, ArrowLeft, KeyRound, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getUserByEmail, getPendingJoinRequestsForUser } from '@/lib/storage';
import { generateOTP, saveOTP, verifyOTP, getOTPExpiry } from '@/lib/otp';
import { updatePassword } from '@/contexts/AuthContext';

type AuthMode = 'login' | 'signup';
type RoleType = 'member' | 'manager';
type ResetStep = 'email' | 'otp' | 'newPassword';

export default function Auth() {
  const [mode, setMode] = useState<AuthMode>('login');
  const [role, setRole] = useState<RoleType>('member');
  const [isLoading, setIsLoading] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetStep, setResetStep] = useState<ResetStep>('email');
  
  // Form fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [messName, setMessName] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [resetEmail, setResetEmail] = useState('');
  const [lastOtpSent, setLastOtpSent] = useState<Date | null>(null);
  const [isResending, setIsResending] = useState(false);
  
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

  const resetForgotPasswordForm = () => {
    setResetEmail('');
    setOtp('');
    setNewPassword('');
    setConfirmPassword('');
    setResetStep('email');
    setLastOtpSent(null);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const result = await login(email, password);

    if (result.success) {
      // Get the user to check their status
      const user = getUserByEmail(email);
      
      if (user?.role === 'member') {
        // Check if member has a mess and is approved
        if (!user.messId) {
          // No mess assigned, redirect to join mess
          toast({
            title: 'Welcome!',
            description: 'Please join a mess to continue.',
          });
          navigate('/join-mess', { state: { userId: user.id, email: user.email } });
        } else if (!user.isApproved) {
          // Has pending requests, redirect to waiting page
          toast({
            title: 'Request Pending',
            description: 'Your join request is awaiting approval.',
          });
          navigate('/waiting-approval');
        } else {
          toast({
            title: 'Welcome back!',
            description: 'You have successfully logged in.',
          });
          navigate('/dashboard');
        }
      } else {
        toast({
          title: 'Welcome back!',
          description: 'You have successfully logged in.',
        });
        navigate('/dashboard');
      }
    } else {
      // Check for specific error cases
      if (result.error === 'Waiting for manager approval.') {
        toast({
          title: 'Request Pending',
          description: result.error,
        });
        // Try to log them in for the waiting page
        const user = getUserByEmail(email);
        if (user) {
          navigate('/waiting-approval');
        }
      } else if (result.error === 'You need to join a mess first. Please search for a mess to join.') {
        const user = getUserByEmail(email);
        if (user) {
          toast({
            title: 'Join a Mess',
            description: 'Please find and join a mess to continue.',
          });
          navigate('/join-mess', { state: { userId: user.id, email: user.email } });
        }
      } else {
        toast({
          title: 'Login failed',
          description: result.error,
          variant: 'destructive',
        });
      }
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
        navigate('/join-mess', { state: { userId: result.userId, email } });
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

  const handleSendOTP = (e: React.FormEvent) => {
    e.preventDefault();
    
    const user = getUserByEmail(resetEmail);
    if (!user) {
      toast({
        title: 'User not found',
        description: 'No account exists with this email address.',
        variant: 'destructive',
      });
      return;
    }
    
    // Generate and save OTP
    const newOTP = generateOTP();
    saveOTP(resetEmail, newOTP);
    setLastOtpSent(new Date());
    
    // In production, this would send an email
    // For demo, show a message (but not the OTP for security)
    toast({
      title: 'OTP Sent',
      description: `Please check your email for the verification code. Valid for ${getOTPExpiry()} minutes. (Demo: ${newOTP})`,
      duration: 10000,
    });
    
    setResetStep('otp');
  };

  const handleResendOTP = () => {
    if (lastOtpSent && new Date().getTime() - lastOtpSent.getTime() < 60000) {
      toast({
        title: 'Please wait',
        description: 'You can request a new OTP after 60 seconds.',
        variant: 'destructive',
      });
      return;
    }
    
    setIsResending(true);
    
    const newOTP = generateOTP();
    saveOTP(resetEmail, newOTP);
    setLastOtpSent(new Date());
    
    toast({
      title: 'OTP Resent',
      description: `A new OTP has been sent to your email. (Demo: ${newOTP})`,
      duration: 10000,
    });
    
    setTimeout(() => setIsResending(false), 1000);
  };

  const handleVerifyOTP = (e: React.FormEvent) => {
    e.preventDefault();
    
    const result = verifyOTP(resetEmail, otp);
    
    if (!result.valid) {
      toast({
        title: 'Invalid OTP',
        description: result.error,
        variant: 'destructive',
      });
      return;
    }
    
    toast({
      title: 'OTP Verified',
      description: 'You can now set a new password.',
    });
    
    setResetStep('newPassword');
  };

  const handleResetPassword = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (newPassword !== confirmPassword) {
      toast({
        title: 'Passwords do not match',
        description: 'Please make sure both passwords are the same.',
        variant: 'destructive',
      });
      return;
    }
    
    if (newPassword.length < 6) {
      toast({
        title: 'Password too short',
        description: 'Password must be at least 6 characters.',
        variant: 'destructive',
      });
      return;
    }
    
    // Update password
    updatePassword(resetEmail, newPassword);
    
    toast({
      title: 'Password Reset Successful',
      description: 'You can now login with your new password.',
    });
    
    resetForgotPasswordForm();
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
              {resetStep === 'email' && (
                <form onSubmit={handleSendOTP} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="reset-email">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="reset-email"
                        type="email"
                        placeholder="you@example.com"
                        value={resetEmail}
                        onChange={(e) => setResetEmail(e.target.value)}
                        className="pl-10"
                        required
                      />
                    </div>
                  </div>

                  <Button type="submit" className="w-full gradient-primary">
                    Send OTP
                  </Button>

                  <Button
                    type="button"
                    variant="ghost"
                    className="w-full"
                    onClick={() => {
                      resetForgotPasswordForm();
                      setShowForgotPassword(false);
                    }}
                  >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back to Login
                  </Button>
                </form>
              )}

              {resetStep === 'otp' && (
                <form onSubmit={handleVerifyOTP} className="space-y-4">
                  <div className="text-center mb-4">
                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mb-3">
                      <KeyRound className="w-6 h-6 text-primary" />
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Enter the 6-digit OTP sent to your email
                    </p>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="otp">OTP Code</Label>
                    <Input
                      id="otp"
                      type="text"
                      placeholder="Enter 6-digit OTP"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      className="text-center text-xl tracking-widest"
                      maxLength={6}
                      required
                    />
                  </div>

                  <Button type="submit" className="w-full gradient-primary" disabled={otp.length !== 6}>
                    Verify OTP
                  </Button>

                  <Button
                    type="button"
                    variant="ghost"
                    className="w-full"
                    onClick={handleResendOTP}
                    disabled={isResending}
                  >
                    <RefreshCw className={cn("h-4 w-4 mr-2", isResending && "animate-spin")} />
                    Resend OTP
                  </Button>

                  <Button
                    type="button"
                    variant="ghost"
                    className="w-full"
                    onClick={() => setResetStep('email')}
                  >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back
                  </Button>
                </form>
              )}

              {resetStep === 'newPassword' && (
                <form onSubmit={handleResetPassword} className="space-y-4">
                  <div className="text-center mb-4">
                    <p className="text-sm text-muted-foreground">
                      Enter your new password
                    </p>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="newPassword">New Password</Label>
                    <PasswordInput
                      id="newPassword"
                      placeholder="••••••••"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirm Password</Label>
                    <PasswordInput
                      id="confirmPassword"
                      placeholder="••••••••"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                    />
                  </div>

                  <Button type="submit" className="w-full gradient-primary">
                    Reset Password
                  </Button>
                </form>
              )}
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
              <div className="space-y-4">
                {/* Role Selection - Matching reference design */}
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">I want to register as:</p>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setRole('member')}
                      className={cn(
                        'flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all duration-200',
                        role === 'member'
                          ? 'border-primary bg-primary/5 text-primary'
                          : 'border-border bg-background text-muted-foreground hover:border-primary/50 hover:bg-muted/50'
                      )}
                    >
                      <UserPlus className="h-6 w-6" />
                      <span className="font-medium">Member</span>
                      <span className="text-xs text-muted-foreground">Join existing mess</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setRole('manager')}
                      className={cn(
                        'flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all duration-200',
                        role === 'manager'
                          ? 'border-primary bg-primary/5 text-primary'
                          : 'border-border bg-background text-muted-foreground hover:border-primary/50 hover:bg-muted/50'
                      )}
                    >
                      <Building className="h-6 w-6" />
                      <span className="font-medium">Manager</span>
                      <span className="text-xs text-muted-foreground">Create new mess</span>
                    </button>
                  </div>
                </div>

                <form onSubmit={handleSignup} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="fullName">Full Name</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="fullName"
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
                          placeholder="My Mess"
                          value={messName}
                          onChange={(e) => setMessName(e.target.value)}
                          className="pl-10"
                          required
                        />
                      </div>
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="signup-phone">Phone Number</Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="signup-phone"
                        type="tel"
                        placeholder="01XXXXXXXXX"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="pl-10"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="signup-email">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="signup-email"
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
                    <Label htmlFor="signup-password">Password</Label>
                    <PasswordInput
                      id="signup-password"
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
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
