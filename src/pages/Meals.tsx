import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
import { useToast } from '@/hooks/use-toast';
import { 
  getActiveMonth,
  getMealsByMonthId,
  getMessMembers,
  createMeal,
  updateMeal,
  deleteMeal,
  notifyMessMembers,
} from '@/lib/storage';
import { Meal, User } from '@/types';
import { Utensils, Plus, Trash2, Edit2, Minus, Coffee, Sun, Moon } from 'lucide-react';
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

    const targetUserId = isManager ? formData.userId : user.id;
    const memberName = members.find(m => m.id === targetUserId)?.fullName || 'Unknown';

    if (editingMeal) {
      updateMeal(editingMeal.id, {
        userId: targetUserId,
        date: formData.date,
        breakfast: formData.breakfast,
        lunch: formData.lunch,
        dinner: formData.dinner,
      });
      notifyMessMembers(user.messId, user.id, {
        type: 'meal',
        title: 'Meal Updated',
        message: `${memberName}'s meal for ${format(new Date(formData.date), 'MMM d')} was updated`,
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
      notifyMessMembers(user.messId, user.id, {
        type: 'meal',
        title: 'Meal Added',
        message: `${memberName}'s meal for ${format(new Date(formData.date), 'MMM d')} was recorded`,
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

  const incrementMeal = (field: 'breakfast' | 'lunch' | 'dinner') => {
    setFormData(prev => ({ ...prev, [field]: Math.min(prev[field] + 0.5, 10) }));
  };

  const decrementMeal = (field: 'breakfast' | 'lunch' | 'dinner') => {
    setFormData(prev => ({ ...prev, [field]: Math.max(prev[field] - 0.5, 0) }));
  };

  const MealCounter = ({ 
    label, 
    value, 
    field, 
    icon: Icon,
    color 
  }: { 
    label: string; 
    value: number; 
    field: 'breakfast' | 'lunch' | 'dinner';
    icon: React.ElementType;
    color: string;
  }) => (
    <motion.div 
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className={`p-4 rounded-xl ${color} flex flex-col items-center gap-3`}
    >
      <div className="flex items-center gap-2">
        <Icon className="h-5 w-5" />
        <span className="font-medium">{label}</span>
      </div>
      <div className="flex items-center gap-3">
        <motion.button
          type="button"
          whileTap={{ scale: 0.9 }}
          onClick={() => decrementMeal(field)}
          className="w-10 h-10 rounded-full bg-background/80 flex items-center justify-center hover:bg-background transition-colors"
        >
          <Minus className="h-4 w-4" />
        </motion.button>
        <motion.span 
          key={value}
          initial={{ scale: 1.2 }}
          animate={{ scale: 1 }}
          className="text-3xl font-bold w-12 text-center"
        >
          {value}
        </motion.span>
        <motion.button
          type="button"
          whileTap={{ scale: 0.9 }}
          onClick={() => incrementMeal(field)}
          className="w-10 h-10 rounded-full bg-background/80 flex items-center justify-center hover:bg-background transition-colors"
        >
          <Plus className="h-4 w-4" />
        </motion.button>
      </div>
    </motion.div>
  );

  // Group meals by date for better display
  const groupedMeals = meals.reduce((acc, meal) => {
    if (!acc[meal.date]) acc[meal.date] = [];
    acc[meal.date].push(meal);
    return acc;
  }, {} as Record<string, Meal[]>);

  return (
    <DashboardLayout>
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-6"
      >
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
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>{editingMeal ? 'Edit Meal' : 'Add Meal'}</DialogTitle>
                <DialogDescription>
                  Record breakfast, lunch, and dinner counts
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-6">
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

                <div className="space-y-4">
                  <Label>Meal Counts</Label>
                  <div className="grid grid-cols-1 gap-3">
                    <MealCounter 
                      label="Breakfast" 
                      value={formData.breakfast} 
                      field="breakfast"
                      icon={Coffee}
                      color="bg-warning/10"
                    />
                    <MealCounter 
                      label="Lunch" 
                      value={formData.lunch} 
                      field="lunch"
                      icon={Sun}
                      color="bg-success/10"
                    />
                    <MealCounter 
                      label="Dinner" 
                      value={formData.dinner} 
                      field="dinner"
                      icon={Moon}
                      color="bg-primary/10"
                    />
                  </div>
                </div>

                <div className="p-4 bg-muted rounded-lg text-center">
                  <p className="text-sm text-muted-foreground">Total Meals</p>
                  <motion.p 
                    key={formData.breakfast + formData.lunch + formData.dinner}
                    initial={{ scale: 1.2 }}
                    animate={{ scale: 1 }}
                    className="text-3xl font-bold text-primary"
                  >
                    {formData.breakfast + formData.lunch + formData.dinner}
                  </motion.p>
                </div>

                <DialogFooter>
                  <Button type="submit" className="w-full gradient-primary">
                    {editingMeal ? 'Update' : 'Add'} Meal
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Meal Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="bg-warning/10 border-warning/20">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-xl bg-warning">
                    <Coffee className="h-6 w-6 text-warning-foreground" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Breakfast</p>
                    <p className="text-2xl font-bold text-foreground">
                      {meals.reduce((sum, m) => sum + m.breakfast, 0)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="bg-success/10 border-success/20">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-xl bg-success">
                    <Sun className="h-6 w-6 text-success-foreground" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Lunch</p>
                    <p className="text-2xl font-bold text-foreground">
                      {meals.reduce((sum, m) => sum + m.lunch, 0)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card className="bg-primary/10 border-primary/20">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-xl bg-primary">
                    <Moon className="h-6 w-6 text-primary-foreground" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Dinner</p>
                    <p className="text-2xl font-bold text-foreground">
                      {meals.reduce((sum, m) => sum + m.dinner, 0)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
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
              <div className="space-y-4">
                <AnimatePresence>
                  {Object.entries(groupedMeals).map(([date, dateMeals], dateIndex) => (
                    <motion.div
                      key={date}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      transition={{ delay: dateIndex * 0.05 }}
                      className="space-y-2"
                    >
                      <h3 className="text-sm font-medium text-muted-foreground sticky top-0 bg-background py-1">
                        {format(new Date(date), 'EEEE, MMMM d, yyyy')}
                      </h3>
                      <div className="grid gap-2">
                        {dateMeals.map((meal) => {
                          const total = meal.breakfast + meal.lunch + meal.dinner;
                          const canEdit = isManager || meal.userId === user?.id;
                          
                          return (
                            <motion.div
                              key={meal.id}
                              whileHover={{ scale: 1.01 }}
                              className="flex items-center justify-between p-4 bg-muted/50 rounded-lg hover:bg-muted transition-colors"
                            >
                              <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                                  <Utensils className="h-5 w-5 text-primary" />
                                </div>
                                <div>
                                  <p className="font-medium">{getMemberName(meal.userId)}</p>
                                  <div className="flex gap-3 text-sm text-muted-foreground">
                                    <span className="flex items-center gap-1">
                                      <Coffee className="h-3 w-3" /> {meal.breakfast}
                                    </span>
                                    <span className="flex items-center gap-1">
                                      <Sun className="h-3 w-3" /> {meal.lunch}
                                    </span>
                                    <span className="flex items-center gap-1">
                                      <Moon className="h-3 w-3" /> {meal.dinner}
                                    </span>
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-3">
                                <div className="text-right">
                                  <p className="text-2xl font-bold text-primary">{total}</p>
                                  <p className="text-xs text-muted-foreground">meals</p>
                                </div>
                                {canEdit && (
                                  <div className="flex gap-1">
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
                              </div>
                            </motion.div>
                          );
                        })}
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </DashboardLayout>
  );
}