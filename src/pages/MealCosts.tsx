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
import { 
  getActiveMonth,
  getMealCostsByMonthId,
  getMessMembers,
  createMealCost,
  updateMealCost,
  deleteMealCost,
} from '@/lib/storage';
import { MealCost, User } from '@/types';
import { ShoppingCart, Plus, Trash2, Edit2 } from 'lucide-react';
import { format } from 'date-fns';
import { formatCurrency } from '@/lib/calculations';
import { Navigate } from 'react-router-dom';

export default function MealCosts() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [mealCosts, setMealCosts] = useState<MealCost[]>([]);
  const [members, setMembers] = useState<User[]>([]);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingCost, setEditingCost] = useState<MealCost | null>(null);
  const [formData, setFormData] = useState({
    userId: '',
    amount: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    description: '',
  });

  const isManager = user?.role === 'manager';

  if (!isManager) {
    return <Navigate to="/dashboard" replace />;
  }

  useEffect(() => {
    loadData();
  }, [user]);

  const loadData = () => {
    if (!user) return;
    
    const activeMonth = getActiveMonth(user.messId);
    if (activeMonth) {
      setMealCosts(getMealCostsByMonthId(activeMonth.id).sort((a, b) => 
        new Date(b.date).getTime() - new Date(a.date).getTime()
      ));
    }
    setMembers(getMessMembers(user.messId));
  };

  const resetForm = () => {
    setFormData({
      userId: user?.id || '',
      amount: '',
      date: format(new Date(), 'yyyy-MM-dd'),
      description: '',
    });
    setEditingCost(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) return;
    
    const activeMonth = getActiveMonth(user.messId);
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
      updateMealCost(editingCost.id, {
        userId: formData.userId,
        amount,
        date: formData.date,
        description: formData.description,
      });
      toast({ title: 'Meal cost updated' });
    } else {
      createMealCost({
        monthId: activeMonth.id,
        userId: formData.userId,
        amount,
        date: formData.date,
        description: formData.description,
      });
      toast({ title: 'Meal cost added' });
    }

    setIsAddDialogOpen(false);
    resetForm();
    loadData();
  };

  const handleEdit = (cost: MealCost) => {
    setFormData({
      userId: cost.userId,
      amount: cost.amount.toString(),
      date: cost.date,
      description: cost.description,
    });
    setEditingCost(cost);
    setIsAddDialogOpen(true);
  };

  const handleDelete = (costId: string) => {
    deleteMealCost(costId);
    loadData();
    toast({ title: 'Meal cost deleted' });
  };

  const getMemberName = (userId: string) => {
    const member = members.find(m => m.id === userId);
    return member?.fullName || 'Unknown';
  };

  const totalCosts = mealCosts.reduce((sum, c) => sum + c.amount, 0);

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Meal Costs</h1>
            <p className="text-muted-foreground">Track grocery and meal expenses</p>
          </div>
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
                  <Label>Purchased By</Label>
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
                    placeholder="What was purchased..."
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    required
                  />
                </div>

                <DialogFooter>
                  <Button type="submit" className="gradient-primary">
                    {editingCost ? 'Update Cost' : 'Add Cost'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
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
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {mealCosts.map(cost => (
                      <TableRow key={cost.id}>
                        <TableCell>{format(new Date(cost.date), 'MMM dd, yyyy')}</TableCell>
                        <TableCell>{getMemberName(cost.userId)}</TableCell>
                        <TableCell className="max-w-xs truncate">{cost.description}</TableCell>
                        <TableCell className="font-semibold text-warning">
                          {formatCurrency(cost.amount)}
                        </TableCell>
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
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
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
