import { useState, useEffect } from 'react';
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
import { useToast } from '@/hooks/use-toast';
import { getMessById, updateMess, generateUniqueMessCode, isMessCodeUnique } from '@/lib/storage';
import { Mess } from '@/types';
import { Building, Copy, Check, Edit2, Settings, RefreshCw, X } from 'lucide-react';
import { Navigate } from 'react-router-dom';

export default function ManageMess() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [mess, setMess] = useState<Mess | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isEditCodeDialogOpen, setIsEditCodeDialogOpen] = useState(false);
  const [newMessName, setNewMessName] = useState('');
  const [newMessCode, setNewMessCode] = useState('');
  const [copied, setCopied] = useState(false);
  const [codeError, setCodeError] = useState('');

  const isManager = user?.role === 'manager';

  useEffect(() => {
    if (user) {
      const messData = getMessById(user.messId);
      setMess(messData || null);
      if (messData) {
        setNewMessName(messData.name);
        setNewMessCode(messData.messCode || '');
      }
    }
  }, [user]);

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
      });
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleUpdateMessName = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!mess || !newMessName.trim()) return;

    updateMess(mess.id, { name: newMessName.trim() });
    
    setMess({ ...mess, name: newMessName.trim() });
    setIsEditDialogOpen(false);
    
    toast({
      title: 'Mess Updated',
      description: 'Your mess name has been updated.',
    });
  };

  const handleGenerateNewCode = () => {
    const newCode = generateUniqueMessCode();
    setNewMessCode(newCode);
    setCodeError('');
  };

  const handleCodeChange = (value: string) => {
    const upperValue = value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8);
    setNewMessCode(upperValue);
    
    if (upperValue.length >= 4) {
      if (!isMessCodeUnique(upperValue, mess?.id)) {
        setCodeError('This code is already in use');
      } else {
        setCodeError('');
      }
    } else {
      setCodeError('');
    }
  };

  const handleUpdateMessCode = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!mess || !newMessCode.trim()) return;
    
    if (newMessCode.length < 4) {
      setCodeError('Code must be at least 4 characters');
      return;
    }
    
    if (!isMessCodeUnique(newMessCode, mess.id)) {
      setCodeError('This code is already in use');
      return;
    }

    updateMess(mess.id, { messCode: newMessCode.trim() });
    
    setMess({ ...mess, messCode: newMessCode.trim() });
    setIsEditCodeDialogOpen(false);
    
    toast({
      title: 'Mess Code Updated',
      description: 'Your mess code has been updated. Share the new code with your members.',
    });
  };

  if (!mess) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
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
      </div>
    </DashboardLayout>
  );
}
