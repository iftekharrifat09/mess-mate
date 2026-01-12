import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
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
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import * as dataService from '@/lib/dataService';
import { OtherCost, User } from '@/types';
import { Receipt, Plus, Trash2, Edit2, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { formatCurrency } from '@/lib/calculations';
import { Navigate } from 'react-router-dom';

export default function OtherCosts() {
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const [otherCosts, setOtherCosts] = useState<OtherCost[]>([]);
  const [members, setMembers] = useState<User[]>([]);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingCost, setEditingCost] = useState<OtherCost | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    userId: '',
    amount: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    description: '',
    isShared: true,
  });

  const isManager = user?.role === 'manager';

  useEffect(() => {
    if (!authLoading && user) {
      loadData();
    }
  }, [user, authLoading]);

  // Wait for auth to finish loading
  if (authLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  const loadData = async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      const [activeMonth, membersData] = await Promise.all([
        dataService.getActiveMonth(user.messId),
        dataService.getMessMembers(user.messId),
      ]);
      
      if (activeMonth) {
        const costs = await dataService.getOtherCostsByMonthId(activeMonth.id);
        setOtherCosts(costs.sort((a, b) => 
          new Date(b.date).getTime() - new Date(a.date).getTime()
        ));
      }
      setMembers(membersData);
    } catch (error) {
      console.error('Error loading other costs:', error);
      toast({
        title: 'Error',
        description: 'Failed to load other costs',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      userId: user?.id || '',
      amount: '',
      date: format(new Date(), 'yyyy-MM-dd'),
      description: '',
      isShared: true,
    });
    setEditingCost(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user || isSaving) return;
    setIsSaving(true);
    
    try {
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

      if (editingCost) {
        await dataService.updateOtherCost(editingCost.id, {
          userId: formData.userId,
          amount,
          date: formData.date,
          description: formData.description,
          isShared: formData.isShared,
        });
        toast({ title: 'Cost updated' });
      } else {
        await dataService.createOtherCost({
          monthId: activeMonth.id,
          userId: formData.userId,
          amount,
          date: formData.date,
          description: formData.description,
          isShared: formData.isShared,
        });
        toast({ title: 'Cost added' });
      }

      setIsAddDialogOpen(false);
      resetForm();
      loadData();
    } catch (error) {
      console.error('Error saving other cost:', error);
      toast({
        title: 'Error',
        description: 'Failed to save cost',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleEdit = (cost: OtherCost) => {
    setFormData({
      userId: cost.userId,
      amount: cost.amount.toString(),
      date: cost.date,
      description: cost.description,
      isShared: cost.isShared,
    });
    setEditingCost(cost);
    setIsAddDialogOpen(true);
  };

  const handleDelete = async (costId: string) => {
    if (deletingId) return;
    setDeletingId(costId);
    try {
      await dataService.deleteOtherCost(costId);
      loadData();
      toast({ title: 'Cost deleted' });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete cost',
        variant: 'destructive',
      });
    } finally {
      setDeletingId(null);
    }
  };

  const getMemberName = (userId: string) => {
    const member = members.find(m => m.id === userId);
    return member?.fullName || 'Unknown';
  };

  const sharedCosts = otherCosts.filter(c => c.isShared);
  const individualCosts = otherCosts.filter(c => !c.isShared);
  const totalShared = sharedCosts.reduce((sum, c) => sum + c.amount, 0);
  const totalIndividual = individualCosts.reduce((sum, c) => sum + c.amount, 0);

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Other Costs</h1>
            <p className="text-muted-foreground">
              {isManager ? 'Track utilities and other expenses (separate from meal costs)' : 'View other cost records (read-only)'}
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
                  Add Cost
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{editingCost ? 'Edit Cost' : 'Add Other Cost'}</DialogTitle>
                  <DialogDescription>
                    {editingCost ? 'Update cost details' : 'Record utilities, rent, or other expenses'}
                  </DialogDescription>
                </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label>Paid By</Label>
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
                  <Label>Description</Label>
                  <Textarea
                    placeholder="E.g., Electricity bill, Gas bill..."
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    required
                  />
                </div>

                <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <div>
                    <Label>Shared Cost</Label>
                    <p className="text-xs text-muted-foreground">
                      Divide equally among all members
                    </p>
                  </div>
                  <Switch
                    checked={formData.isShared}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isShared: checked }))}
                  />
                </div>

                <DialogFooter>
                  <Button type="submit" className="gradient-primary" disabled={isSaving}>
                    {isSaving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving...</> : (editingCost ? 'Update Cost' : 'Add Cost')}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
            </Dialog>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="bg-info/10 border-info/20">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-info">
                  <Receipt className="h-6 w-6 text-info-foreground" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Shared Costs</p>
                  <p className="text-2xl font-bold text-foreground">{formatCurrency(totalShared)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-muted/50">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-muted-foreground/20">
                  <Receipt className="h-6 w-6 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Individual Costs</p>
                  <p className="text-2xl font-bold text-foreground">{formatCurrency(totalIndividual)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5 text-primary" />
              Cost Records
            </CardTitle>
          </CardHeader>
          <CardContent>
            {otherCosts.length === 0 ? (
              <div className="text-center py-12">
                <Receipt className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No other costs recorded yet.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Paid By</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Amount</TableHead>
                      {isManager && <TableHead className="text-right">Actions</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {otherCosts.map(cost => (
                      <TableRow key={cost.id}>
                        <TableCell>{format(new Date(cost.date), 'MMM dd, yyyy')}</TableCell>
                        <TableCell>{getMemberName(cost.userId)}</TableCell>
                        <TableCell className="max-w-xs truncate">{cost.description}</TableCell>
                        <TableCell>
                          {cost.isShared ? (
                            <Badge variant="secondary">Shared</Badge>
                          ) : (
                            <Badge variant="outline">Individual</Badge>
                          )}
                        </TableCell>
                        <TableCell className="font-semibold">
                          {formatCurrency(cost.amount)}
                        </TableCell>
                        {isManager && (
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button 
                                size="sm" 
                                variant="ghost"
                                onClick={() => handleEdit(cost)}
                              >
                                <Edit2 className="h-4 w-4" />
                              </Button>
                              <Button 
                                size="sm" 
                                variant="ghost" 
                                className="text-destructive"
                                onClick={() => handleDelete(cost.id)}
                                disabled={deletingId === cost.id}
                              >
                                {deletingId === cost.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
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
