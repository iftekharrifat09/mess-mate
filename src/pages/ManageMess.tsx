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
import { getDescoSettings, saveDescoSettings, removeDescoSettings, fetchAllDescoData, DescoSettings } from '@/lib/descoService';

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
  const [descoApiType, setDescoApiType] = useState<'tkdes' | 'unified'>('tkdes');
  const [isSavingDesco, setIsSavingDesco] = useState(false);
  const [descoSaved, setDescoSaved] = useState(false);
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
        const desco = getDescoSettings(messData.id);
        if (desco) {
          setDescoAccountNo(desco.accountNo);
          setDescoApiType(desco.apiType);
          setDescoSaved(true);
        }
        // Load activity logs (last 1 year)
        const logs = await dataService.getActivityLogsByMessId(messData.id);
        const oneYearAgo = new Date();
        oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
        setActivityLogs(logs.filter(l => new Date(l.createdAt) >= oneYearAgo));
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
              Set your DESCO prepaid meter details to track electricity usage on the dashboard
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Account Number</Label>
                <Input
                  value={descoAccountNo}
                  onChange={(e) => setDescoAccountNo(e.target.value.replace(/\D/g, ''))}
                  placeholder="e.g., 26036446"
                  maxLength={20}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>API Type</Label>
              <div className="flex gap-3">
                <Button
                  type="button"
                  variant={descoApiType === 'tkdes' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setDescoApiType('tkdes')}
                >
                  TKDES
                </Button>
                <Button
                  type="button"
                  variant={descoApiType === 'unified' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setDescoApiType('unified')}
                >
                  Unified
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Select TKDES for Tongi/Kaliakair area, Unified for others
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <Button
                className="gradient-primary"
                disabled={!descoAccountNo || isSavingDesco}
                onClick={async () => {
                  if (!mess || isSavingDesco) return;
                  setIsSavingDesco(true);
                  try {
                    const settings: DescoSettings = {
                      accountNo: descoAccountNo,
                      apiType: descoApiType,
                    };
                    saveDescoSettings(mess.id, settings);
                    // Verify by fetching balance
                    const result = await fetchAllDescoData(mess.id, settings, true);
                    if (result) {
                      setDescoSaved(true);
                      toast({
                        title: 'DESCO Settings Saved',
                        description: 'Electricity data will now show on the dashboard.',
                        variant: 'success',
                      });
                    } else {
                      toast({
                        title: 'No Data Found',
                        description: 'Could not fetch data for this account. Please check the account number and meter number.',
                        variant: 'destructive',
                      });
                    }
                  } catch {
                    toast({
                      title: 'Error',
                      description: 'Failed to verify DESCO account. Please try again.',
                      variant: 'destructive',
                    });
                  } finally {
                    setIsSavingDesco(false);
                  }
                }}
              >
                {isSavingDesco ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  'Save & Verify'
                )}
              </Button>
              {descoSaved && (
                <Button
                  variant="outline"
                  onClick={() => {
                    if (!mess) return;
                    removeDescoSettings(mess.id);
                    setDescoAccountNo('');
                    setDescoSaved(false);
                    toast({
                      title: 'DESCO Settings Removed',
                      description: 'Electricity data will no longer show on the dashboard.',
                    });
                  }}
                >
                  Remove
                </Button>
              )}
            </div>
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
