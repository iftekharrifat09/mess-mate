import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
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
import { MealCost, User } from '@/types';
import { ShoppingCart, Plus, Trash2, Edit2, Wallet, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { formatCurrency } from '@/lib/calculations';
import { Navigate } from 'react-router-dom';

export default function MealCosts() {
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const [mealCosts, setMealCosts] = useState<MealCost[]>([]);
  const [members, setMembers] = useState<User[]>([]);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingCost, setEditingCost] = useState<MealCost | null>(null);
  const [addAsDeposit, setAddAsDeposit] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    userId: '',
    amount: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    description: '',
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
        const costs = await dataService.getMealCostsByMonthId(activeMonth.id);
        setMealCosts(costs.sort((a, b) => 
          new Date(b.date).getTime() - new Date(a.date).getTime()
        ));
      }
      setMembers(membersData);
    } catch (error) {
      console.error('Error loading meal costs:', error);
      toast({
        title: 'Error',
        description: 'Failed to load meal costs',
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
    });
    setEditingCost(null);
    setAddAsDeposit(false);
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

      const member = members.find(m => m.id === formData.userId);

      if (editingCost) {
        await dataService.updateMealCost(editingCost.id, {
          userId: formData.userId,
          amount,
          date: formData.date,
          description: formData.description,
        });
        
        await dataService.notifyMessMembers(user.messId, user.id, {
          type: 'cost',
          title: 'Meal Cost Updated',
          message: `${member?.fullName}'s meal cost of ${formatCurrency(amount)} was updated`,
        });
        
        toast({ title: 'Meal cost updated' });
      } else {
        // Create meal cost
        await dataService.createMealCost({
          monthId: activeMonth.id,
          userId: formData.userId,
          amount,
          date: formData.date,
          description: formData.description,
        });
        
        // Also add as deposit if checkbox is checked
        if (addAsDeposit) {
          await dataService.createDeposit({
            monthId: activeMonth.id,
            userId: formData.userId,
            amount,
            date: formData.date,
            note: `Auto-deposit from meal cost: ${formData.description}`,
          });
          
          await dataService.notifyMessMembers(user.messId, user.id, {
            type: 'deposit',
            title: 'Deposit Added',
            message: `${member?.fullName} deposited ${formatCurrency(amount)} (from meal cost)`,
          });
        }
        
        await dataService.notifyMessMembers(user.messId, user.id, {
          type: 'cost',
          title: 'Meal Cost Added',
          message: `${member?.fullName} spent ${formatCurrency(amount)} for ${formData.description}`,
        });
        
        toast({ 
          title: addAsDeposit ? 'Meal cost & deposit added' : 'Meal cost added',
          description: addAsDeposit ? `Added ${formatCurrency(amount)} as both meal cost and deposit for ${member?.fullName}` : undefined,
        });
      }

      setIsAddDialogOpen(false);
      resetForm();
      loadData();
    } catch (error) {
      console.error('Error saving meal cost:', error);
      toast({
        title: 'Error',
        description: 'Failed to save meal cost',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleEdit = (cost: MealCost) => {
    setFormData({
      userId: cost.userId,
      amount: cost.amount.toString(),
      date: cost.date,
      description: cost.description,
    });
    setEditingCost(cost);
    setAddAsDeposit(false);
    setIsAddDialogOpen(true);
  };

  const handleDelete = async (costId: string) => {
    if (deletingId) return;
    setDeletingId(costId);
    try {
      await dataService.deleteMealCost(costId);
      loadData();
      toast({ title: 'Meal cost deleted' });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete meal cost',
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

  const totalCosts = mealCosts.reduce((sum, c) => sum + c.amount, 0);

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
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-6"
      >
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Meal Costs</h1>
            <p className="text-muted-foreground">
              {isManager ? 'Track grocery and meal expenses' : 'View meal cost records (read-only)'}
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
                  Add Meal Cost
                </Button>
              </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingCost ? 'Edit Meal Cost' : 'Add Meal Cost'}</DialogTitle>
                <DialogDescription>
                  {editingCost ? 'Update meal cost details' : 'Record a bazar or meal expense'}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label>Select Date</Label>
                  <Input
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label>Meal Cost Amount</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="e.g. 1000"
                    value={formData.amount}
                    onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label>Meal Cost/ Bazar Details (optional)</Label>
                  <Textarea
                    placeholder="e.g. rice, oil, fish etc."
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Select Shoppers</Label>
                  <Select 
                    value={formData.userId} 
                    onValueChange={(v) => setFormData(prev => ({ ...prev, userId: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select Shoppers" />
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
                
                {!editingCost && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="flex items-center space-x-2 p-3 bg-muted/50 rounded-lg border"
                  >
                    <Checkbox 
                      id="addAsDeposit" 
                      checked={addAsDeposit}
                      onCheckedChange={(checked) => setAddAsDeposit(checked === true)}
                    />
                    <label
                      htmlFor="addAsDeposit"
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex items-center gap-2 cursor-pointer"
                    >
                      <Wallet className="h-4 w-4 text-primary" />
                      Add also as Deposit For this shopper?
                    </label>
                  </motion.div>
                )}

                {addAsDeposit && !editingCost && (
                  <motion.p
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-xs text-muted-foreground bg-primary/5 p-2 rounded"
                  >
                    This will add {formData.amount ? formatCurrency(parseFloat(formData.amount)) : '₹0'} as a deposit for {formData.userId ? getMemberName(formData.userId) : 'the selected shopper'} in addition to recording the meal cost.
                  </motion.p>
                )}

                <DialogFooter>
                  <Button type="submit" className="gradient-primary" disabled={!formData.userId || isSaving}>
                    {isSaving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving...</> : (editingCost ? 'Update Cost' : 'Add Cost')}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
            </Dialog>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="bg-warning/10 border-warning/20">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-warning">
                  <ShoppingCart className="h-6 w-6 text-warning-foreground" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Meal Costs</p>
                  <p className="text-2xl font-bold text-foreground">{formatCurrency(totalCosts)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5 text-primary" />
              Cost Records
            </CardTitle>
          </CardHeader>
          <CardContent>
            {mealCosts.length === 0 ? (
              <div className="text-center py-12">
                <ShoppingCart className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No meal costs recorded yet.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Purchased By</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Amount</TableHead>
                      {isManager && <TableHead className="text-right">Actions</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {mealCosts.map(cost => (
                      <TableRow key={cost.id}>
                        <TableCell>{format(new Date(cost.date), 'MMM dd, yyyy')}</TableCell>
                        <TableCell>{getMemberName(cost.userId)}</TableCell>
                        <TableCell className="max-w-[100px] sm:max-w-[150px] md:max-w-[200px]">
                          <span className="block truncate" title={cost.description}>
                            {cost.description || '-'}
                          </span>
                        </TableCell>
                        <TableCell className="font-semibold text-warning">
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
      </motion.div>
    </DashboardLayout>
  );
}
