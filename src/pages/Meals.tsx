import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
  getMealsByMonthId,
  getMessMembers,
  createMeal,
  updateMeal,
  deleteMeal,
} from '@/lib/storage';
import { Meal, User } from '@/types';
import { Utensils, Plus, Trash2, Edit2 } from 'lucide-react';
import { format } from 'date-fns';

export default function Meals() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [meals, setMeals] = useState<Meal[]>([]);
  const [members, setMembers] = useState<User[]>([]);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingMeal, setEditingMeal] = useState<Meal | null>(null);
  const [formData, setFormData] = useState({
    userId: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    breakfast: 0,
    lunch: 0,
    dinner: 0,
  });

  const isManager = user?.role === 'manager';

  useEffect(() => {
    loadData();
  }, [user]);

  const loadData = () => {
    if (!user) return;
    
    const activeMonth = getActiveMonth(user.messId);
    if (activeMonth) {
      setMeals(getMealsByMonthId(activeMonth.id).sort((a, b) => 
        new Date(b.date).getTime() - new Date(a.date).getTime()
      ));
    }
    setMembers(getMessMembers(user.messId));
  };

  const resetForm = () => {
    setFormData({
      userId: user?.id || '',
      date: format(new Date(), 'yyyy-MM-dd'),
      breakfast: 0,
      lunch: 0,
      dinner: 0,
    });
    setEditingMeal(null);
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

    // Non-managers can only add meals for themselves
    const targetUserId = isManager ? formData.userId : user.id;

    if (editingMeal) {
      updateMeal(editingMeal.id, {
        userId: targetUserId,
        date: formData.date,
        breakfast: formData.breakfast,
        lunch: formData.lunch,
        dinner: formData.dinner,
      });
      toast({ title: 'Meal updated' });
    } else {
      createMeal({
        monthId: activeMonth.id,
        userId: targetUserId,
        date: formData.date,
        breakfast: formData.breakfast,
        lunch: formData.lunch,
        dinner: formData.dinner,
      });
      toast({ title: 'Meal added' });
    }

    setIsAddDialogOpen(false);
    resetForm();
    loadData();
  };

  const handleEdit = (meal: Meal) => {
    if (!isManager && meal.userId !== user?.id) return;
    
    setFormData({
      userId: meal.userId,
      date: meal.date,
      breakfast: meal.breakfast,
      lunch: meal.lunch,
      dinner: meal.dinner,
    });
    setEditingMeal(meal);
    setIsAddDialogOpen(true);
  };

  const handleDelete = (mealId: string) => {
    deleteMeal(mealId);
    loadData();
    toast({ title: 'Meal deleted' });
  };

  const getMemberName = (userId: string) => {
    const member = members.find(m => m.id === userId);
    return member?.fullName || 'Unknown';
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Meals</h1>
            <p className="text-muted-foreground">Track daily meal counts</p>
          </div>
          <Dialog open={isAddDialogOpen} onOpenChange={(open) => {
            setIsAddDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button className="gradient-primary">
                <Plus className="h-4 w-4 mr-2" />
                Add Meal
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingMeal ? 'Edit Meal' : 'Add Meal'}</DialogTitle>
                <DialogDescription>
                  Record breakfast, lunch, and dinner counts
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                {isManager && (
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
                )}
                
                <div className="space-y-2">
                  <Label>Date</Label>
                  <Input
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                    required
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Breakfast</Label>
                    <Input
                      type="number"
                      min="0"
                      step="0.5"
                      value={formData.breakfast}
                      onChange={(e) => setFormData(prev => ({ ...prev, breakfast: parseFloat(e.target.value) || 0 }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Lunch</Label>
                    <Input
                      type="number"
                      min="0"
                      step="0.5"
                      value={formData.lunch}
                      onChange={(e) => setFormData(prev => ({ ...prev, lunch: parseFloat(e.target.value) || 0 }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Dinner</Label>
                    <Input
                      type="number"
                      min="0"
                      step="0.5"
                      value={formData.dinner}
                      onChange={(e) => setFormData(prev => ({ ...prev, dinner: parseFloat(e.target.value) || 0 }))}
                    />
                  </div>
                </div>

                <DialogFooter>
                  <Button type="submit" className="gradient-primary">
                    {editingMeal ? 'Update' : 'Add'} Meal
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Utensils className="h-5 w-5 text-primary" />
              Meal Records
            </CardTitle>
          </CardHeader>
          <CardContent>
            {meals.length === 0 ? (
              <div className="text-center py-12">
                <Utensils className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No meals recorded yet.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Member</TableHead>
                      <TableHead className="text-center">Breakfast</TableHead>
                      <TableHead className="text-center">Lunch</TableHead>
                      <TableHead className="text-center">Dinner</TableHead>
                      <TableHead className="text-center">Total</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {meals.map(meal => {
                      const total = meal.breakfast + meal.lunch + meal.dinner;
                      const canEdit = isManager || meal.userId === user?.id;
                      
                      return (
                        <TableRow key={meal.id}>
                          <TableCell>{format(new Date(meal.date), 'MMM dd, yyyy')}</TableCell>
                          <TableCell>{getMemberName(meal.userId)}</TableCell>
                          <TableCell className="text-center">{meal.breakfast}</TableCell>
                          <TableCell className="text-center">{meal.lunch}</TableCell>
                          <TableCell className="text-center">{meal.dinner}</TableCell>
                          <TableCell className="text-center font-semibold">{total}</TableCell>
                          <TableCell className="text-right">
                            {canEdit && (
                              <div className="flex justify-end gap-2">
                                <Button size="sm" variant="ghost" onClick={() => handleEdit(meal)}>
                                  <Edit2 className="h-4 w-4" />
                                </Button>
                                {isManager && (
                                  <Button size="sm" variant="ghost" className="text-destructive" onClick={() => handleDelete(meal.id)}>
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                )}
                              </div>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
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
