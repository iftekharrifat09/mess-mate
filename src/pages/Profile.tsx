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
import { generateOTP, saveOTP, verifyOTP, getOTPExpiry } from '@/lib/otp';
import { updatePassword } from '@/contexts/AuthContext';
import { User, Phone, Mail, Check, X, Edit2, Shield } from 'lucide-react';
import { format } from 'date-fns';

export default function Profile() {
  const { user, refreshUser } = useAuth();
  const { toast } = useToast();
  
  const [isEditingName, setIsEditingName] = useState(false);
  const [isEditingPhone, setIsEditingPhone] = useState(false);
  const [isEditingEmail, setIsEditingEmail] = useState(false);
  const [emailStep, setEmailStep] = useState<'password' | 'otp' | 'verify'>('password');
  
  const [fullName, setFullName] = useState(user?.fullName || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [newEmail, setNewEmail] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [otpAttempts, setOtpAttempts] = useState(0);
  const [lastOtpSent, setLastOtpSent] = useState<Date | null>(null);

  const handleUpdateName = () => {
    if (!user || !fullName.trim()) return;
    updateUser(user.id, { fullName: fullName.trim() });
    refreshUser();
    setIsEditingName(false);
    toast({ title: 'Name updated successfully' });
  };

  const handleUpdatePhone = () => {
    if (!user || !phone.trim()) return;
    updateUser(user.id, { phone: phone.trim() });
    refreshUser();
    setIsEditingPhone(false);
    toast({ title: 'Phone updated successfully' });
  };

  const handlePasswordVerify = () => {
    if (!user) return;
    // Verify current password (simple check using localStorage)
    const passwords = JSON.parse(localStorage.getItem('mess_manager_passwords') || '{}');
    if (passwords[user.email.toLowerCase()] !== currentPassword) {
      toast({ title: 'Incorrect password', variant: 'destructive' });
      return;
    }

    if (getUserByEmail(newEmail)) {
      toast({ title: 'Email already in use', variant: 'destructive' });
      return;
    }

    // Send OTP
    const newOTP = generateOTP();
    saveOTP(newEmail, newOTP);
    
    toast({
      title: 'OTP Generated',
      description: `Your OTP is: ${newOTP} (Valid for ${getOTPExpiry()} minutes)`,
      duration: 10000,
    });
    
    setEmailStep('otp');
    setLastOtpSent(new Date());
  };

  const handleVerifyOTP = () => {
    if (!user) return;
    
    const result = verifyOTP(newEmail, otp);
    if (!result.valid) {
      setOtpAttempts(prev => prev + 1);
      toast({ title: result.error || 'Invalid OTP', variant: 'destructive' });
      return;
    }

    // Update email
    const passwords = JSON.parse(localStorage.getItem('mess_manager_passwords') || '{}');
    const currentPasswordValue = passwords[user.email.toLowerCase()];
    delete passwords[user.email.toLowerCase()];
    passwords[newEmail.toLowerCase()] = currentPasswordValue;
    localStorage.setItem('mess_manager_passwords', JSON.stringify(passwords));

    updateUser(user.id, { email: newEmail, emailVerified: true });
    refreshUser();
    
    setIsEditingEmail(false);
    setEmailStep('password');
    setNewEmail('');
    setCurrentPassword('');
    setOtp('');
    
    toast({ title: 'Email updated and verified' });
  };

  const handleResendOTP = () => {
    if (lastOtpSent && new Date().getTime() - lastOtpSent.getTime() < 60000) {
      toast({ title: 'Please wait before requesting a new OTP', variant: 'destructive' });
      return;
    }
    
    const newOTP = generateOTP();
    saveOTP(newEmail, newOTP);
    setLastOtpSent(new Date());
    
    toast({
      title: 'OTP Resent',
      description: `Your new OTP is: ${newOTP}`,
      duration: 10000,
    });
  };

  const handleVerifyCurrentEmail = () => {
    if (!user) return;
    
    const newOTP = generateOTP();
    saveOTP(user.email, newOTP);
    
    toast({
      title: 'Verification OTP Sent',
      description: `Your OTP is: ${newOTP}`,
      duration: 10000,
    });
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
              <CardDescription>Manage your email and verification</CardDescription>
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
      </motion.div>
    </DashboardLayout>
  );
}