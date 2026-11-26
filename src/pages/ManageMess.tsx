import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import * as dataService from '@/lib/dataService';
import { Mess } from '@/types';
import { Building, Copy, Check, Edit2, Settings, RefreshCw, Trash2, AlertTriangle, Zap, Loader2, History, Crown, UserMinus, CalendarPlus, CalendarX } from 'lucide-react';
import { MessActivityLog } from '@/types';
import { Navigate } from 'react-router-dom';
import { getDescoSettings, saveDescoSession, verifyDescoAccount, removeDescoSettings, fetchAllDescoData, DescoSettings } from '@/lib/descoService';

export default function ManageMess() {
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [mess, setMess] = useState<Mess | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isEditCodeDialogOpen, setIsEditCodeDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [newMessName, setNewMessName] = useState('');
  const [newMessCode, setNewMessCode] = useState('');
  const [copied, setCopied] = useState(false);
  const [codeError, setCodeError] = useState('');
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [loading, setLoading] = useState(true);
  const [descoAccountNo, setDescoAccountNo] = useState('');
  const [savedDescoAccountNo, setSavedDescoAccountNo] = useState('');
  const [descoLoginId, setDescoLoginId] = useState('');
  const [descoPassword, setDescoPassword] = useState('');
  const [isSavingDesco, setIsSavingDesco] = useState(false);
  const [descoSessionSaved, setDescoSessionSaved] = useState(false);
  const [descoAccountVerified, setDescoAccountVerified] = useState(false);
  const [isEditingDescoLogin, setIsEditingDescoLogin] = useState(false);
  const [activityLogs, setActivityLogs] = useState<MessActivityLog[]>([]);

  const isManager = user?.role === 'manager';

  useEffect(() => {
    if (user) {
      loadMessData();
    }
  }, [user]);

  const loadMessData = async () => {
    if (!user) return;
    setLoading(true);
    
    try {
      console.log('Loading mess data for messId:', user.messId);
      const messData = await dataService.getMessById(user.messId);
      console.log('Mess data loaded:', messData);
      setMess(messData || null);
      if (messData) {
        setNewMessName(messData.name);
        setNewMessCode(messData.messCode || '');
        // Load DESCO settings
        const desco = await getDescoSettings(messData.id);
        setDescoSessionSaved(Boolean(desco?.hasSession));
        setDescoAccountNo(desco?.accountNo || '');
        setSavedDescoAccountNo(desco?.accountNo || '');
        setDescoAccountVerified(Boolean(desco?.hasAccount));
        // Load activity logs (last 1 year)
        const logs = await dataService.getActivityLogsByMessId(messData.id);
        const oneYearAgo = new Date();
        oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
        setActivityLogs(logs.filter(l => new Date(l.createdAt) >= oneYearAgo).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
      }
    } catch (error) {
      console.error('Error loading mess data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!isManager) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleCopyCode = () => {
    if (mess?.messCode) {
      navigator.clipboard.writeText(mess.messCode);
      setCopied(true);
      toast({
        title: 'Copied!',
        description: 'Mess code copied to clipboard.',
        variant: 'success',
      });
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleUpdateMessName = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!mess || !newMessName.trim()) return;

    try {
      await dataService.updateMess(mess.id, { name: newMessName.trim() });
      setMess({ ...mess, name: newMessName.trim() });
      setIsEditDialogOpen(false);
      
      toast({
        title: 'Mess Updated',
        description: 'Your mess name has been updated.',
        variant: 'success',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update mess name.',
        variant: 'destructive',
      });
    }
  };

  const handleGenerateNewCode = async () => {
    const newCode = await dataService.generateUniqueMessCode();
    setNewMessCode(newCode);
    setCodeError('');
  };

  const handleCodeChange = async (value: string) => {
    const upperValue = value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8);
    setNewMessCode(upperValue);
    
    if (upperValue.length >= 4) {
      const isUnique = await dataService.isMessCodeUnique(upperValue, mess?.id);
      if (!isUnique) {
        setCodeError('This code is already in use');
      } else {
        setCodeError('');
      }
    } else {
      setCodeError('');
    }
  };

  const handleUpdateMessCode = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!mess || !newMessCode.trim()) return;
    
    if (newMessCode.length < 4) {
      setCodeError('Code must be at least 4 characters');
      return;
    }
    
    const isUnique = await dataService.isMessCodeUnique(newMessCode, mess.id);
    if (!isUnique) {
      setCodeError('This code is already in use');
      return;
    }

    try {
      await dataService.updateMess(mess.id, { messCode: newMessCode.trim() });
      setMess({ ...mess, messCode: newMessCode.trim() });
      setIsEditCodeDialogOpen(false);
      
      toast({
        title: 'Mess Code Updated',
        description: 'Your mess code has been updated. Share the new code with your members.',
        variant: 'success',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update mess code.',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteMess = async () => {
    if (!mess || deleteConfirmation !== 'Sure') return;
    
    try {
      await dataService.deleteMess(mess.id);
      logout();
      toast({ title: 'Mess deleted', description: 'All data has been removed.', variant: 'success' });
      navigate('/auth');
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete mess.',
        variant: 'destructive',
      });
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </DashboardLayout>
    );
  }

  if (!mess) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Mess not found.</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-6"
      >
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Manage Mess</h1>
            <p className="text-muted-foreground">Configure your mess settings</p>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Mess Code Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building className="h-5 w-5 text-primary" />
                Mess Code
              </CardTitle>
              <CardDescription>
                Share this code with members so they can join your mess
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                <div className="flex-1 p-4 bg-muted rounded-lg font-mono text-2xl text-center tracking-widest font-bold">
                  {mess.messCode || 'N/A'}
                </div>
                <div className="flex flex-col gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={handleCopyCode}
                    title="Copy code"
                  >
                    {copied ? (
                      <Check className="h-5 w-5 text-success" />
                    ) : (
                      <Copy className="h-5 w-5" />
                    )}
                  </Button>
                  <Dialog open={isEditCodeDialogOpen} onOpenChange={setIsEditCodeDialogOpen}>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="icon" title="Edit code">
                        <Edit2 className="h-4 w-4" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Edit Mess Code</DialogTitle>
                        <DialogDescription>
                          Change your mess code or generate a new one
                        </DialogDescription>
                      </DialogHeader>
                      <form onSubmit={handleUpdateMessCode} className="space-y-4">
                        <div className="space-y-2">
                          <Label>Mess Code</Label>
                          <div className="flex gap-2">
                            <Input
                              value={newMessCode}
                              onChange={(e) => handleCodeChange(e.target.value)}
                              placeholder="e.g., ABC123"
                              className="font-mono text-lg tracking-widest uppercase"
                              maxLength={8}
                              required
                            />
                            <Button 
                              type="button"
                              variant="outline"
                              onClick={handleGenerateNewCode}
                              title="Generate new code"
                            >
                              <RefreshCw className="h-4 w-4" />
                            </Button>
                          </div>
                          {codeError && (
                            <p className="text-sm text-destructive">{codeError}</p>
                          )}
                          <p className="text-xs text-muted-foreground">
                            4-8 characters, letters and numbers only
                          </p>
                        </div>
                        <DialogFooter className="gap-2">
                          <Button 
                            type="button" 
                            variant="outline"
                            onClick={() => {
                              setNewMessCode(mess.messCode || '');
                              setCodeError('');
                              setIsEditCodeDialogOpen(false);
                            }}
                          >
                            Cancel
                          </Button>
                          <Button 
                            type="submit" 
                            className="gradient-primary"
                            disabled={!!codeError || newMessCode.length < 4}
                          >
                            Save Code
                          </Button>
                        </DialogFooter>
                      </form>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
              <p className="text-sm text-muted-foreground mt-3">
                Members can use this code to search and request to join your mess.
              </p>
            </CardContent>
          </Card>

          {/* Mess Settings Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5 text-primary" />
                Mess Settings
              </CardTitle>
              <CardDescription>
                Update your mess information
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="text-muted-foreground">Mess Name</Label>
                <div className="flex items-center gap-3">
                  <div className="flex-1 p-3 bg-muted rounded-lg">
                    {mess.name}
                  </div>
                  <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="icon">
                        <Edit2 className="h-4 w-4" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Edit Mess Name</DialogTitle>
                        <DialogDescription>
                          Update your mess name
                        </DialogDescription>
                      </DialogHeader>
                      <form onSubmit={handleUpdateMessName} className="space-y-4">
                        <div className="space-y-2">
                          <Label>Mess Name</Label>
                          <Input
                            value={newMessName}
                            onChange={(e) => setNewMessName(e.target.value)}
                            placeholder="Enter new mess name"
                            required
                          />
                        </div>
                        <DialogFooter>
                          <Button type="submit" className="gradient-primary">
                            Save Changes
                          </Button>
                        </DialogFooter>
                      </form>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-muted-foreground">Created On</Label>
                <div className="p-3 bg-muted rounded-lg">
                  {new Date(mess.createdAt).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* DESCO Electricity Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-yellow-500" />
              DESCO Electricity
            </CardTitle>
            <CardDescription>
              Verify your DESCO login first, then verify the account number linked to it
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {descoSessionSaved && !isEditingDescoLogin ? (
              <div className="space-y-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-medium text-success">DESCO login saved and verified</p>
                    <p className="text-xs text-muted-foreground">Login details are encrypted on the server and are never saved in this browser.</p>
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setDescoLoginId('');
                      setDescoPassword('');
                      setIsEditingDescoLogin(true);
                    }}
                  >
                    Change login
                  </Button>
                </div>
                <div className="space-y-2">
                  <Label>Account Number</Label>
                  <Input
                    value={descoAccountNo}
                    onChange={(e) => setDescoAccountNo(e.target.value.replace(/\D/g, ''))}
                    placeholder="e.g., 26036446"
                    maxLength={20}
                    inputMode="numeric"
                  />
                  <p className="text-xs text-muted-foreground">
                    {descoAccountVerified && descoAccountNo === savedDescoAccountNo
                      ? 'This account is verified for the saved DESCO login.'
                      : 'The account is saved only after DESCO confirms it belongs to this login.'}
                  </p>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Button
                    className="gradient-primary"
                    disabled={!descoAccountNo || isSavingDesco}
                    onClick={async () => {
                      if (!mess || isSavingDesco) return;
                      setIsSavingDesco(true);
                      try {
                        const accountToVerify = descoAccountNo;
                        const verified = await verifyDescoAccount(mess.id, accountToVerify);
                        if (!verified.success) {
                          setDescoAccountNo(savedDescoAccountNo);
                          setDescoAccountVerified(Boolean(savedDescoAccountNo));
                          toast({
                            title: 'Could not verify account',
                            description: verified.error || 'Check that this account belongs to the saved DESCO login.',
                            variant: 'destructive',
                          });
                          return;
                        }
                        setDescoAccountNo(accountToVerify);
                        setSavedDescoAccountNo(accountToVerify);
                        setDescoAccountVerified(true);
                        const settings: DescoSettings = { accountNo: accountToVerify, hasSession: true, hasAccount: true };
                        const result = await fetchAllDescoData(mess.id, settings, true);
                        toast(result
                          ? { title: 'DESCO account connected', description: 'Live balance and usage will appear on the dashboard.', variant: 'success' }
                          : { title: 'Account verified and saved', description: 'DESCO data is not available right now. You can refresh later.', variant: 'default' });
                      } catch {
                        setDescoAccountNo(savedDescoAccountNo);
                        setDescoAccountVerified(Boolean(savedDescoAccountNo));
                        toast({ title: 'Could not verify account', description: 'Check the account number and try again.', variant: 'destructive' });
                      } finally {
                        setIsSavingDesco(false);
                      }
                    }}
                  >
                    {isSavingDesco ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Verifying account...</> : 'Verify & Save Account'}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setDescoLoginId('');
                      setDescoPassword('');
                      setIsEditingDescoLogin(true);
                    }}
                  >
                    Change login
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>DESCO Login (phone or email)</Label>
                  <Input
                    value={descoLoginId}
                    onChange={(e) => setDescoLoginId(e.target.value)}
                    placeholder="Phone number or email"
                    autoComplete="username"
                  />
                </div>
                <div className="space-y-2">
                  <Label>DESCO Password</Label>
                  <Input
                    type="password"
                    value={descoPassword}
                    onChange={(e) => setDescoPassword(e.target.value)}
                    placeholder="Enter DESCO password"
                    autoComplete="new-password"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Login details are encrypted on the server and are never saved in this browser.
                </p>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Button
                    className="gradient-primary"
                    disabled={!descoLoginId.trim() || !descoPassword || isSavingDesco}
                    onClick={async () => {
                      if (!mess || isSavingDesco) return;
                      setIsSavingDesco(true);
                      try {
                        const saved = await saveDescoSession(mess.id, descoLoginId.trim(), descoPassword);
                        if (!saved.success) {
                          toast({ title: 'Could not verify DESCO login', description: saved.error || 'Check the login details and try again.', variant: 'destructive' });
                          return;
                        }
                        setDescoSessionSaved(true);
                        setDescoAccountNo('');
                        setSavedDescoAccountNo('');
                        setDescoAccountVerified(false);
                        setDescoLoginId('');
                        setDescoPassword('');
                        setIsEditingDescoLogin(false);
                        toast({ title: 'DESCO login saved', description: 'Now enter the account number linked to this login.', variant: 'success' });
                      } catch {
                        toast({ title: 'Could not verify DESCO login', description: 'Check the login details and try again.', variant: 'destructive' });
                      } finally {
                        setIsSavingDesco(false);
                      }
                    }}
                  >
                    {isSavingDesco ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Verifying login...</> : 'Save & Verify Login'}
                  </Button>
                  {isEditingDescoLogin && (
                    <Button variant="outline" onClick={() => {
                      setDescoLoginId('');
                      setDescoPassword('');
                      setIsEditingDescoLogin(false);
                    }}>
                      Cancel
                    </Button>
                  )}
                </div>
              </div>
            )}
            {descoSessionSaved && (
              <div className="border-t border-border pt-4">
                <Button
                  variant="outline"
                  disabled={isSavingDesco}
                  onClick={async () => {
                    if (!mess) return;
                    const removed = await removeDescoSettings(mess.id);
                    if (!removed) {
                      toast({ title: 'Could not remove DESCO settings', description: 'Please check your connection and try again.', variant: 'destructive' });
                      return;
                    }
                    setDescoAccountNo('');
                    setSavedDescoAccountNo('');
                    setDescoLoginId('');
                    setDescoPassword('');
                    setDescoSessionSaved(false);
                    setDescoAccountVerified(false);
                    setIsEditingDescoLogin(false);
                    toast({ title: 'DESCO Settings Removed', description: 'Electricity data will no longer show on the dashboard.' });
                  }}
                >
                  Remove
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Activity Log - Past 1 Year */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <History className="h-5 w-5 text-primary" />
              Activity Log
            </CardTitle>
            <CardDescription>
              Track manager changes, member removals, and month history from the past year
            </CardDescription>
          </CardHeader>
          <CardContent>
            {activityLogs.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">No activity recorded yet.</p>
            ) : (
              <div className="space-y-3 max-h-[400px] overflow-y-auto">
                {activityLogs.map(log => {
                  const icon = log.type === 'manager_change' ? <Crown className="h-4 w-4 text-[goldenrod]" /> :
                               log.type === 'member_removed' ? <UserMinus className="h-4 w-4 text-destructive" /> :
                               log.type === 'member_joined' ? <UserMinus className="h-4 w-4 text-success" /> :
                               log.type === 'month_created' ? <CalendarPlus className="h-4 w-4 text-success" /> :
                               log.type === 'month_deleted' ? <CalendarX className="h-4 w-4 text-destructive" /> :
                               <History className="h-4 w-4 text-muted-foreground" />;
                  
                  return (
                    <div key={log.id} className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 border border-border/50">
                      <div className="mt-0.5">{icon}</div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground">{log.description}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(log.createdAt).toLocaleDateString('en-US', {
                            year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                          })}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
                        onClick={async () => {
                          try {
                            await dataService.deleteActivityLog(log.id);
                            setActivityLogs(prev => prev.filter(l => l.id !== log.id));
                            toast({ title: 'Activity log deleted' });
                          } catch {
                            toast({ title: 'Failed to delete', variant: 'destructive' });
                          }
                        }}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Danger Zone */}
        <Card className="border-destructive/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Danger Zone
            </CardTitle>
            <CardDescription>
              Irreversible actions that affect your entire mess
            </CardDescription>
          </CardHeader>
          <CardContent>
            <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" className="w-full sm:w-auto">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Mess
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle className="flex items-center gap-2 text-destructive">
                    <AlertTriangle className="h-5 w-5" />
                    Delete Mess Permanently?
                  </AlertDialogTitle>
                  <AlertDialogDescription className="space-y-2">
                    <p>This action cannot be undone. This will permanently delete:</p>
                    <ul className="list-disc list-inside text-sm space-y-1">
                      <li>All members and their data</li>
                      <li>All meal records</li>
                      <li>All deposits and costs</li>
                      <li>All notices and notes</li>
                    </ul>
                    <p className="font-medium pt-2">Type "Sure" below to confirm:</p>
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <Input
                  value={deleteConfirmation}
                  onChange={(e) => setDeleteConfirmation(e.target.value)}
                  placeholder='Type "Sure" to confirm'
                  className="mt-2"
                />
                <AlertDialogFooter>
                  <Button variant="outline" onClick={() => { setIsDeleteDialogOpen(false); setDeleteConfirmation(''); }}>
                    Cancel
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={handleDeleteMess}
                    disabled={deleteConfirmation !== 'Sure'}
                  >
                    Delete Mess
                  </Button>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </CardContent>
        </Card>
      </motion.div>
    </DashboardLayout>
  );
}
