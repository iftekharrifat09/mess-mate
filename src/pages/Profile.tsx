import { useState } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PasswordInput } from '@/components/ui/password-input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { updateUser, getUserByEmail } from '@/lib/storage';
import {
  updateProfileAPI,
  sendOtpAPI,
  verifyOtpAPI,
  changePasswordAPI,
  requestEmailChangeAPI,
  confirmEmailChangeAPI,
} from '@/lib/api';
import { User, Phone, Mail, Check, X, Edit2, Shield, Lock, KeyRound } from 'lucide-react';
import { format } from 'date-fns';

export default function Profile() {
  const { user, refreshUser } = useAuth();
  const { toast } = useToast();
  
  const [isEditingName, setIsEditingName] = useState(false);
  const [isEditingPhone, setIsEditingPhone] = useState(false);
  const [isEditingEmail, setIsEditingEmail] = useState(false);
  const [isVerifyingEmail, setIsVerifyingEmail] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [emailStep, setEmailStep] = useState<'password' | 'otp'>('password');
  
  const [fullName, setFullName] = useState(user?.fullName || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [newEmail, setNewEmail] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [lastOtpSent, setLastOtpSent] = useState<Date | null>(null);
  
  // Password change fields
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');

  const handleUpdateName = async () => {
    if (!user || !fullName.trim()) return;

    // Try backend profile update first (falls back to localStorage if backend unavailable)
    const result = await updateProfileAPI({
      name: fullName.trim(),
      phone: (phone || user.phone || '').trim(),
    });

    if (result.success) {
      await refreshUser();
      setIsEditingName(false);
      toast({ title: 'Name updated successfully' });
      return;
    }

    // Fallback to localStorage
    if ((result as any).usingLocalStorage) {
      updateUser(user.id, { fullName: fullName.trim() });
      await refreshUser();
      setIsEditingName(false);
      toast({ title: 'Name updated successfully' });
      return;
    }

    toast({
      title: 'Failed to update name',
      description: (result as any).error || 'Please try again',
      variant: 'destructive',
    });
  };

  const handleUpdatePhone = async () => {
    if (!user || !phone.trim()) return;

    const nextPhone = phone.trim();

    // Try backend profile update first (falls back to localStorage if backend unavailable)
    const result = await updateProfileAPI({
      name: (fullName || user.fullName || '').trim(),
      phone: nextPhone,
    });

    if (result.success) {
      await refreshUser();
      setIsEditingPhone(false);
      toast({ title: 'Phone updated successfully' });
      return;
    }

    // Fallback to localStorage
    if ((result as any).usingLocalStorage) {
      updateUser(user.id, { phone: nextPhone });
      await refreshUser();
      setIsEditingPhone(false);
      toast({ title: 'Phone updated successfully' });
      return;
    }

    toast({
      title: 'Failed to update phone',
      description: (result as any).error || 'Please try again',
      variant: 'destructive',
    });
  };

  const handlePasswordVerify = async () => {
    if (!user) return;

    if (!newEmail || !currentPassword) return;

    // Local fast check (only for localStorage mode)
    if (getUserByEmail(newEmail)) {
      toast({ title: 'Email already in use', variant: 'destructive' });
      return;
    }

    const result = await requestEmailChangeAPI({
      newEmail,
      currentPassword,
    });

    if (result.success) {
      toast({
        title: 'OTP sent',
        description: 'Please check your email for the verification code.',
      });
      setEmailStep('otp');
      setLastOtpSent(new Date());
      return;
    }

    toast({
      title: (result as any).error === 'Current password is incorrect' ? 'Incorrect password' : 'Mail sending Unsuccessful',
      description: (result as any).error || 'Failed to send OTP. Please try again.',
      variant: 'destructive',
    });
  };

  const handleVerifyOTP = async () => {
    if (!user) return;

    const result = await confirmEmailChangeAPI({ newEmail, otp });

    if (!result.success) {
      toast({
        title: 'Invalid OTP',
        description: (result as any).error || 'Invalid or expired OTP.',
        variant: 'destructive',
      });
      return;
    }

    await refreshUser();

    setIsEditingEmail(false);
    setEmailStep('password');
    setNewEmail('');
    setCurrentPassword('');
    setOtp('');

    toast({ title: 'Email updated and verified' });
  };

  const handleResendOTP = async () => {
    if (lastOtpSent && new Date().getTime() - lastOtpSent.getTime() < 60000) {
      toast({ title: 'Please wait before requesting a new OTP', variant: 'destructive' });
      return;
    }
    
    const result = await sendOtpAPI('email-change', newEmail);
    
    if (result.success) {
      setLastOtpSent(new Date());
      toast({
        title: 'OTP sent',
        description: 'Please check your email for the verification code.',
      });
    } else {
      toast({
        title: 'Mail sending Unsuccessful',
        description: result.error || 'Failed to send OTP. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleVerifyCurrentEmail = async () => {
    if (!user) return;
    
    const result = await sendOtpAPI('email-verification', user.email);
    
    if (result.success) {
      toast({
        title: 'Verification OTP sent',
        description: 'Please check your email for the verification code.',
      });
      setIsVerifyingEmail(true);
      setLastOtpSent(new Date());
    } else {
      toast({
        title: 'Mail sending Unsuccessful',
        description: result.error || 'Failed to send OTP. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleVerifyCurrentEmailOTP = async () => {
    if (!user) return;

    const result = await verifyOtpAPI('email-verification', user.email, otp);

    if (!result.success) {
      toast({
        title: 'Invalid OTP',
        description: (result as any).error || 'Invalid or expired OTP.',
        variant: 'destructive',
      });
      return;
    }

    await refreshUser();
    setIsVerifyingEmail(false);
    setOtp('');

    toast({ title: 'Email verified successfully' });
  };

  const handleChangePassword = async () => {
    if (!user) return;

    // Validate new password
    if (newPassword.length < 6) {
      toast({ title: 'New password must be at least 6 characters', variant: 'destructive' });
      return;
    }

    if (newPassword !== confirmNewPassword) {
      toast({ title: 'New passwords do not match', variant: 'destructive' });
      return;
    }

    const result = await changePasswordAPI({
      currentPassword: oldPassword,
      newPassword,
    });

    if (!result.success) {
      toast({
        title: 'Password change failed',
        description: (result as any).error || 'Please try again.',
        variant: 'destructive',
      });
      return;
    }

    setIsChangingPassword(false);
    setOldPassword('');
    setNewPassword('');
    setConfirmNewPassword('');

    toast({ title: 'Password changed successfully' });
  };

  if (!user) return null;

  return (
    <DashboardLayout>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-6"
      >
        <div>
          <h1 className="text-3xl font-bold text-foreground">My Profile</h1>
          <p className="text-muted-foreground">Manage your account settings</p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Basic Info Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5 text-primary" />
                Basic Information
              </CardTitle>
              <CardDescription>Your personal details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Full Name */}
              <div className="space-y-2">
                <Label>Full Name</Label>
                {isEditingName ? (
                  <div className="flex gap-2">
                    <Input
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Enter your name"
                    />
                    <Button size="icon" onClick={handleUpdateName}>
                      <Check className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="outline" onClick={() => { setIsEditingName(false); setFullName(user.fullName); }}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <span>{user.fullName}</span>
                    <Button variant="ghost" size="sm" onClick={() => setIsEditingName(true)}>
                      <Edit2 className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>

              {/* Phone */}
              <div className="space-y-2">
                <Label>Phone Number</Label>
                {isEditingPhone ? (
                  <div className="flex gap-2">
                    <Input
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="Enter your phone"
                    />
                    <Button size="icon" onClick={handleUpdatePhone}>
                      <Check className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="outline" onClick={() => { setIsEditingPhone(false); setPhone(user.phone); }}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <span className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      {user.phone || 'Not set'}
                    </span>
                    <Button variant="ghost" size="sm" onClick={() => setIsEditingPhone(true)}>
                      <Edit2 className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>

              {/* Role & Joined */}
              <div className="grid grid-cols-2 gap-4 pt-2">
                <div className="p-3 bg-muted/50 rounded-lg">
                  <p className="text-xs text-muted-foreground">Role</p>
                  <p className="font-medium capitalize">{user.role}</p>
                </div>
                <div className="p-3 bg-muted/50 rounded-lg">
                  <p className="text-xs text-muted-foreground">Joined</p>
                  <p className="font-medium">{format(new Date(user.createdAt), 'MMM yyyy')}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Email & Security Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-primary" />
                Email & Security
              </CardTitle>
              <CardDescription>Manage your email and password</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Email */}
              <div className="space-y-2">
                <Label>Email Address</Label>
                <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span>{user.email}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {user.emailVerified ? (
                      <Badge variant="secondary" className="bg-success/10 text-success">
                        <Check className="h-3 w-3 mr-1" /> Verified
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="bg-warning/10 text-warning">
                        Not Verified
                      </Badge>
                    )}
                    <Button variant="ghost" size="sm" onClick={() => setIsEditingEmail(true)}>
                      <Edit2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>

              {!user.emailVerified && (
                <Button variant="outline" className="w-full" onClick={handleVerifyCurrentEmail}>
                  Verify Current Email
                </Button>
              )}

              {/* Change Password */}
              <div className="space-y-2 pt-4 border-t">
                <Label className="flex items-center gap-2">
                  <Lock className="h-4 w-4" />
                  Password
                </Label>
                <Button variant="outline" className="w-full" onClick={() => setIsChangingPassword(true)}>
                  Change Password
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Email Change Dialog */}
        <Dialog open={isEditingEmail} onOpenChange={(open) => {
          setIsEditingEmail(open);
          if (!open) {
            setEmailStep('password');
            setNewEmail('');
            setCurrentPassword('');
            setOtp('');
          }
        }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Change Email Address</DialogTitle>
              <DialogDescription>
                {emailStep === 'password' && 'Enter your current password and new email'}
                {emailStep === 'otp' && 'Enter the OTP sent to your new email'}
              </DialogDescription>
            </DialogHeader>

            {emailStep === 'password' && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>New Email</Label>
                  <Input
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="Enter new email"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Current Password</Label>
                  <PasswordInput
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Enter your password"
                  />
                </div>
                <DialogFooter>
                  <Button onClick={handlePasswordVerify} className="gradient-primary" disabled={!newEmail || !currentPassword}>
                    Continue
                  </Button>
                </DialogFooter>
              </div>
            )}

            {emailStep === 'otp' && (
              <div className="space-y-4">
                <div className="text-center mb-4">
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mb-3">
                    <KeyRound className="w-6 h-6 text-primary" />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Enter the 6-digit OTP sent to {newEmail}
                  </p>
                </div>
                <div className="space-y-2">
                  <Label>OTP Code</Label>
                  <Input
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="Enter 6-digit OTP"
                    className="text-center text-xl tracking-widest"
                    maxLength={6}
                  />
                </div>
                <Button variant="ghost" className="w-full" onClick={handleResendOTP}>
                  Resend OTP
                </Button>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setEmailStep('password')}>
                    Back
                  </Button>
                  <Button onClick={handleVerifyOTP} className="gradient-primary" disabled={otp.length !== 6}>
                    Verify & Update
                  </Button>
                </DialogFooter>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Verify Current Email Dialog */}
        <Dialog open={isVerifyingEmail} onOpenChange={(open) => {
          setIsVerifyingEmail(open);
          if (!open) setOtp('');
        }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Verify Your Email</DialogTitle>
              <DialogDescription>
                Enter the OTP sent to {user.email}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="text-center mb-4">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mb-3">
                  <KeyRound className="w-6 h-6 text-primary" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>OTP Code</Label>
                <Input
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="Enter 6-digit OTP"
                  className="text-center text-xl tracking-widest"
                  maxLength={6}
                />
              </div>
              <Button variant="ghost" className="w-full" onClick={async () => {
                if (lastOtpSent && new Date().getTime() - lastOtpSent.getTime() < 60000) {
                  toast({ title: 'Please wait before requesting a new OTP', variant: 'destructive' });
                  return;
                }
                const result = await sendOtpAPI('email-verification', user.email);
                if (result.success) {
                  setLastOtpSent(new Date());
                  toast({
                    title: 'OTP sent',
                    description: 'Please check your email for the verification code.',
                  });
                } else {
                  toast({
                    title: 'Mail sending Unsuccessful',
                    description: result.error || 'Failed to send OTP. Please try again.',
                    variant: 'destructive',
                  });
                }
              }}>
                Resend OTP
              </Button>
              <DialogFooter>
                <Button onClick={handleVerifyCurrentEmailOTP} className="gradient-primary" disabled={otp.length !== 6}>
                  Verify Email
                </Button>
              </DialogFooter>
            </div>
          </DialogContent>
        </Dialog>

        {/* Change Password Dialog */}
        <Dialog open={isChangingPassword} onOpenChange={(open) => {
          setIsChangingPassword(open);
          if (!open) {
            setOldPassword('');
            setNewPassword('');
            setConfirmNewPassword('');
          }
        }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Change Password</DialogTitle>
              <DialogDescription>
                Enter your current password and choose a new one
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Current Password</Label>
                <PasswordInput
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                  placeholder="Enter current password"
                />
              </div>
              <div className="space-y-2">
                <Label>New Password</Label>
                <PasswordInput
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password (min 6 characters)"
                />
              </div>
              <div className="space-y-2">
                <Label>Confirm New Password</Label>
                <PasswordInput
                  value={confirmNewPassword}
                  onChange={(e) => setConfirmNewPassword(e.target.value)}
                  placeholder="Confirm new password"
                />
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsChangingPassword(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleChangePassword} 
                  className="gradient-primary" 
                  disabled={!oldPassword || !newPassword || !confirmNewPassword}
                >
                  Change Password
                </Button>
              </DialogFooter>
            </div>
          </DialogContent>
        </Dialog>
      </motion.div>
    </DashboardLayout>
  );
}
