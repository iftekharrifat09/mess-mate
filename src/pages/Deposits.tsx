import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import * as dataService from '@/lib/dataService';
import { Deposit, User } from '@/types';
import { Wallet, Plus, Trash2, Edit2, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { formatCurrency } from '@/lib/calculations';
import { Navigate } from 'react-router-dom';

export default function Deposits() {
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const [deposits, setDeposits] = useState<Deposit[]>([]);
  const [members, setMembers] = useState<User[]>([]);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingDeposit, setEditingDeposit] = useState<Deposit | null>(null);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    userId: '',
    amount: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    note: '',
  });
  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const isManager = user?.role === 'manager';

  useEffect(() => {
    if (!authLoading && user) {
      loadData();
    }
  }, [user, authLoading]);

  const loadData = async () => {
    if (!user) return;
    setLoading(true);
    
    try {
      const [activeMonth, membersData] = await Promise.all([
        dataService.getActiveMonth(user.messId),
        dataService.getMessMembers(user.messId),
      ]);
      
      if (activeMonth) {
        const depositsData = await dataService.getDepositsByMonthId(activeMonth.id);
        setDeposits(depositsData.sort((a, b) => 
          new Date(b.date).getTime() - new Date(a.date).getTime()
        ));
      }
      setMembers(membersData);
    } catch (error) {
      console.error('Error loading deposits:', error);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      userId: '',
      amount: '',
      date: format(new Date(), 'yyyy-MM-dd'),
      note: '',
    });
    setEditingDeposit(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user || isSaving) return;
    setIsSaving(true);
    
    const activeMonth = await dataService.getActiveMonth(user.messId);
    if (!activeMonth) {
      toast({
        title: 'No active month',
        description: 'Please start a new month first.',
        variant: 'destructive',
      });
      return;
    }

    const amount = parseFloat(formData.amount);
    if (isNaN(amount) || amount <= 0) {
      toast({
        title: 'Invalid amount',
        description: 'Please enter a valid amount.',
        variant: 'destructive',
      });
      return;
    }

    try {
      if (editingDeposit) {
        await dataService.updateDeposit(editingDeposit.id, {
          userId: formData.userId,
          amount,
          date: formData.date,
          note: formData.note || undefined,
        });
        toast({ title: 'Deposit updated' });
      } else {
        await dataService.createDeposit({
          monthId: activeMonth.id,
          userId: formData.userId,
          amount,
          date: formData.date,
          note: formData.note || undefined,
        });
        toast({ title: 'Deposit added' });
      }

      setIsAddDialogOpen(false);
      resetForm();
      loadData();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to save deposit',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleEdit = (deposit: Deposit) => {
    setFormData({
      userId: deposit.userId,
      amount: deposit.amount.toString(),
      date: deposit.date,
      note: deposit.note || '',
    });
    setEditingDeposit(deposit);
    setIsAddDialogOpen(true);
  };

  const handleDelete = async (depositId: string) => {
    if (deletingId) return;
    setDeletingId(depositId);
    try {
      await dataService.deleteDeposit(depositId);
      loadData();
      toast({ title: 'Deposit deleted' });
    } finally {
      setDeletingId(null);
    }
  };

  const getMemberName = (userId: string) => {
    const member = members.find(m => m.id === userId);
    return member?.fullName || 'Unknown';
  };

  const totalDeposits = deposits.reduce((sum, d) => sum + d.amount, 0);

  if (authLoading || loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Loading deposits...</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Deposits</h1>
            <p className="text-muted-foreground">
              {isManager ? 'Manage member deposits' : 'View deposit records (read-only)'}
            </p>
          </div>
          {isManager && (
            <Dialog open={isAddDialogOpen} onOpenChange={(open) => {
              setIsAddDialogOpen(open);
              if (!open) resetForm();
            }}>
              <DialogTrigger asChild>
                <Button className="gradient-primary">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Deposit
                </Button>
              </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingDeposit ? 'Edit Deposit' : 'Add Deposit'}</DialogTitle>
                <DialogDescription>
                  {editingDeposit ? 'Update deposit details' : 'Record a deposit from a member'}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label>Member</Label>
                  <Select 
                    value={formData.userId} 
                    onValueChange={(v) => setFormData(prev => ({ ...prev, userId: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select member" />
                    </SelectTrigger>
                    <SelectContent>
                      {members.map(member => (
                        <SelectItem key={member.id} value={member.id}>
                          {member.fullName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label>Amount</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="Enter amount"
                    value={formData.amount}
                    onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label>Date</Label>
                  <Input
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label>Note (optional)</Label>
                  <Textarea
                    placeholder="Add a note..."
                    value={formData.note}
                    onChange={(e) => setFormData(prev => ({ ...prev, note: e.target.value }))}
                  />
                </div>

                <DialogFooter>
                  <Button type="submit" className="gradient-primary" disabled={isSaving}>
                    {isSaving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving...</> : (editingDeposit ? 'Update Deposit' : 'Add Deposit')}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
            </Dialog>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="bg-success/10 border-success/20">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-success">
                  <Wallet className="h-6 w-6 text-success-foreground" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Deposits</p>
                  <p className="text-2xl font-bold text-foreground">{formatCurrency(totalDeposits)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wallet className="h-5 w-5 text-primary" />
              Deposit Records
            </CardTitle>
          </CardHeader>
          <CardContent>
            {deposits.length === 0 ? (
              <div className="text-center py-12">
                <Wallet className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No deposits recorded yet.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Member</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Note</TableHead>
                      {isManager && <TableHead className="text-right">Actions</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {deposits.map(deposit => (
                      <TableRow key={deposit.id}>
                        <TableCell>{format(new Date(deposit.date), 'MMM dd, yyyy')}</TableCell>
                        <TableCell>{getMemberName(deposit.userId)}</TableCell>
                        <TableCell className="font-semibold text-success">
                          {formatCurrency(deposit.amount)}
                        </TableCell>
                        <TableCell className="text-muted-foreground max-w-[100px] sm:max-w-[150px] md:max-w-[200px]">
                          <span className="block truncate" title={deposit.note || '-'}>
                            {deposit.note || '-'}
                          </span>
                        </TableCell>
                        {isManager && (
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button 
                                size="sm" 
                                variant="ghost"
                                onClick={() => handleEdit(deposit)}
                              >
                                <Edit2 className="h-4 w-4" />
                              </Button>
                              <Button 
                                size="sm" 
                                variant="ghost" 
                                className="text-destructive"
                                onClick={() => handleDelete(deposit.id)}
                                disabled={deletingId === deposit.id}
                              >
                                {deletingId === deposit.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                              </Button>
                            </div>
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
