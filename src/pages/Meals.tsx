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
import { Utensils, Plus, Trash2, Edit2, Minus, Coffee, Sun, Moon, Settings2, Calendar } from 'lucide-react';
import { format, isToday, isBefore } from 'date-fns';

// Default meal settings storage
const DEFAULT_MEALS_KEY = 'mess_manager_default_meals';

interface DefaultMeals {
  breakfast: number;
  lunch: number;
  dinner: number;
}

function getDefaultMeals(messId: string): DefaultMeals {
  const data = localStorage.getItem(DEFAULT_MEALS_KEY);
  const all = data ? JSON.parse(data) : {};
  return all[messId] || { breakfast: 0, lunch: 1, dinner: 1 };
}

function saveDefaultMeals(messId: string, defaults: DefaultMeals): void {
  const data = localStorage.getItem(DEFAULT_MEALS_KEY);
  const all = data ? JSON.parse(data) : {};
  all[messId] = defaults;
  localStorage.setItem(DEFAULT_MEALS_KEY, JSON.stringify(all));
}

export default function Meals() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [meals, setMeals] = useState<Meal[]>([]);
  const [members, setMembers] = useState<User[]>([]);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isDefaultsDialogOpen, setIsDefaultsDialogOpen] = useState(false);
  const [editingMeal, setEditingMeal] = useState<Meal | null>(null);
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [memberMeals, setMemberMeals] = useState<Record<string, { breakfast: number; lunch: number; dinner: number }>>({});
  const [defaultMeals, setDefaultMeals] = useState<DefaultMeals>({ breakfast: 0, lunch: 1, dinner: 1 });

  const isManager = user?.role === 'manager';

  useEffect(() => {
    loadData();
  }, [user]);

  useEffect(() => {
    if (user) {
      const defaults = getDefaultMeals(user.messId);
      setDefaultMeals(defaults);
    }
  }, [user]);

  // Initialize member meals when members or date changes
  useEffect(() => {
    if (members.length > 0 && user) {
      const defaults = getDefaultMeals(user.messId);
      const existingMealsForDate = meals.filter(m => m.date === selectedDate);
      
      const initial: Record<string, { breakfast: number; lunch: number; dinner: number }> = {};
      members.forEach(member => {
        const existingMeal = existingMealsForDate.find(m => m.userId === member.id);
        if (existingMeal) {
          initial[member.id] = {
            breakfast: existingMeal.breakfast,
            lunch: existingMeal.lunch,
            dinner: existingMeal.dinner,
          };
        } else {
          initial[member.id] = { ...defaults };
        }
      });
      setMemberMeals(initial);
    }
  }, [members, selectedDate, meals, user]);

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

  // Check if date already has meals
  const dateHasMeals = (date: string): boolean => {
    return meals.some(m => m.date === date);
  };

  // Get dates that already have meals for calendar disabling
  const getDatesWithMeals = (): string[] => {
    return [...new Set(meals.map(m => m.date))];
  };

  const updateMemberMeal = (memberId: string, field: 'breakfast' | 'lunch' | 'dinner', delta: number) => {
    setMemberMeals(prev => ({
      ...prev,
      [memberId]: {
        ...prev[memberId],
        [field]: Math.max(0, Math.min((prev[memberId]?.[field] || 0) + delta, 10)),
      },
    }));
  };

  const setMemberMealValue = (memberId: string, field: 'breakfast' | 'lunch' | 'dinner', value: number) => {
    setMemberMeals(prev => ({
      ...prev,
      [memberId]: {
        ...prev[memberId],
        [field]: Math.max(0, Math.min(value, 10)),
      },
    }));
  };

  const handleSubmitAll = () => {
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

    // Check if date already has meals (for adding new)
    const existingMealsForDate = meals.filter(m => m.date === selectedDate);
    const isEditing = existingMealsForDate.length > 0;

    let mealsCreated = 0;
    let mealsUpdated = 0;

    Object.entries(memberMeals).forEach(([memberId, mealData]) => {
      const existingMeal = existingMealsForDate.find(m => m.userId === memberId);
      
      if (existingMeal) {
        updateMeal(existingMeal.id, {
          breakfast: mealData.breakfast,
          lunch: mealData.lunch,
          dinner: mealData.dinner,
        });
        mealsUpdated++;
      } else {
        createMeal({
          monthId: activeMonth.id,
          userId: memberId,
          date: selectedDate,
          breakfast: mealData.breakfast,
          lunch: mealData.lunch,
          dinner: mealData.dinner,
        });
        mealsCreated++;
      }
    });

    notifyMessMembers(user.messId, user.id, {
      type: 'meal',
      title: isEditing ? 'Meals Updated' : 'Meals Added',
      message: `Meals for ${format(new Date(selectedDate), 'MMM d')} have been ${isEditing ? 'updated' : 'recorded'}`,
    });

    toast({ 
      title: isEditing ? 'Meals updated' : 'Meals added',
      description: `${mealsCreated + mealsUpdated} meal records saved`,
    });

    setIsAddDialogOpen(false);
    loadData();
  };

  const handleSaveDefaults = () => {
    if (!user) return;
    saveDefaultMeals(user.messId, defaultMeals);
    toast({ title: 'Default meals saved' });
    setIsDefaultsDialogOpen(false);
  };

  const handleEdit = (meal: Meal) => {
    if (!isManager && meal.userId !== user?.id) return;
    setSelectedDate(meal.date);
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

  const getMemberTotal = (memberId: string) => {
    const data = memberMeals[memberId];
    if (!data) return 0;
    return data.breakfast + data.lunch + data.dinner;
  };

  // Group meals by date for better display
  const groupedMeals = meals.reduce((acc, meal) => {
    if (!acc[meal.date]) acc[meal.date] = [];
    acc[meal.date].push(meal);
    return acc;
  }, {} as Record<string, Meal[]>);

  // Check if selected date is valid for adding meals
  const isDateValidForAdding = () => {
    const selected = new Date(selectedDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    selected.setHours(0, 0, 0, 0);
    return selected <= today;
  };

  const MealInput = ({ 
    value, 
    onChange,
    onIncrement,
    onDecrement,
  }: { 
    value: number;
    onChange: (v: number) => void;
    onIncrement: () => void;
    onDecrement: () => void;
  }) => (
    <div className="flex items-center">
      <motion.button
        type="button"
        whileTap={{ scale: 0.9 }}
        onClick={onDecrement}
        className="w-7 h-7 rounded-l border border-r-0 border-input bg-muted flex items-center justify-center hover:bg-muted/80 transition-colors"
      >
        <Minus className="h-3 w-3" />
      </motion.button>
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
        className="w-12 h-7 text-center border-y border-input bg-background text-sm focus:outline-none focus:ring-1 focus:ring-primary"
        step="0.5"
        min="0"
        max="10"
      />
      <motion.button
        type="button"
        whileTap={{ scale: 0.9 }}
        onClick={onIncrement}
        className="w-7 h-7 rounded-r border border-l-0 border-input bg-muted flex items-center justify-center hover:bg-muted/80 transition-colors"
      >
        <Plus className="h-3 w-3" />
      </motion.button>
    </div>
  );

  return (
    <DashboardLayout>
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-6"
      >
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Meals</h1>
            <p className="text-muted-foreground">Track daily meal counts</p>
          </div>
          <div className="flex gap-2">
            {isManager && (
              <Dialog open={isDefaultsDialogOpen} onOpenChange={setIsDefaultsDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline">
                    <Settings2 className="h-4 w-4 mr-2" />
                    Default Meals
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-sm">
                  <DialogHeader>
                    <DialogTitle>Default Meal Settings</DialogTitle>
                    <DialogDescription>
                      Set default values for new meal entries
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="flex items-center justify-between p-3 bg-warning/10 rounded-lg">
                      <div className="flex items-center gap-2">
                        <Coffee className="h-4 w-4 text-warning" />
                        <span>Breakfast</span>
                      </div>
                      <MealInput
                        value={defaultMeals.breakfast}
                        onChange={(v) => setDefaultMeals(prev => ({ ...prev, breakfast: v }))}
                        onIncrement={() => setDefaultMeals(prev => ({ ...prev, breakfast: Math.min(prev.breakfast + 0.5, 10) }))}
                        onDecrement={() => setDefaultMeals(prev => ({ ...prev, breakfast: Math.max(prev.breakfast - 0.5, 0) }))}
                      />
                    </div>
                    <div className="flex items-center justify-between p-3 bg-success/10 rounded-lg">
                      <div className="flex items-center gap-2">
                        <Sun className="h-4 w-4 text-success" />
                        <span>Lunch</span>
                      </div>
                      <MealInput
                        value={defaultMeals.lunch}
                        onChange={(v) => setDefaultMeals(prev => ({ ...prev, lunch: v }))}
                        onIncrement={() => setDefaultMeals(prev => ({ ...prev, lunch: Math.min(prev.lunch + 0.5, 10) }))}
                        onDecrement={() => setDefaultMeals(prev => ({ ...prev, lunch: Math.max(prev.lunch - 0.5, 0) }))}
                      />
                    </div>
                    <div className="flex items-center justify-between p-3 bg-primary/10 rounded-lg">
                      <div className="flex items-center gap-2">
                        <Moon className="h-4 w-4 text-primary" />
                        <span>Dinner</span>
                      </div>
                      <MealInput
                        value={defaultMeals.dinner}
                        onChange={(v) => setDefaultMeals(prev => ({ ...prev, dinner: v }))}
                        onIncrement={() => setDefaultMeals(prev => ({ ...prev, dinner: Math.min(prev.dinner + 0.5, 10) }))}
                        onDecrement={() => setDefaultMeals(prev => ({ ...prev, dinner: Math.max(prev.dinner - 0.5, 0) }))}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button onClick={handleSaveDefaults} className="w-full gradient-primary">
                      Save Defaults
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}
            <Dialog open={isAddDialogOpen} onOpenChange={(open) => {
              setIsAddDialogOpen(open);
              if (!open) {
                setSelectedDate(format(new Date(), 'yyyy-MM-dd'));
              }
            }}>
              <DialogTrigger asChild>
                <Button className="gradient-primary">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Meal
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Utensils className="h-5 w-5 text-primary" />
                    {dateHasMeals(selectedDate) ? 'Edit Meals' : 'Add Meals'}
                  </DialogTitle>
                  <DialogDescription>
                    Record meals for all members
                  </DialogDescription>
                </DialogHeader>
                
                {/* Default Meal Display */}
                <motion.div 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center justify-between p-3 bg-muted rounded-lg"
                >
                  <div>
                    <p className="text-sm font-medium">Current Default meal</p>
                    <p className="text-xs text-muted-foreground">
                      breakfast: {defaultMeals.breakfast}, lunch: {defaultMeals.lunch}, dinner: {defaultMeals.dinner}
                    </p>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="icon"
                    onClick={() => {
                      setIsAddDialogOpen(false);
                      setIsDefaultsDialogOpen(true);
                    }}
                  >
                    <Edit2 className="h-4 w-4" />
                  </Button>
                </motion.div>

                {/* Date Selection */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Select Date
                  </Label>
                  <Input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    max={format(new Date(), 'yyyy-MM-dd')}
                  />
                  {dateHasMeals(selectedDate) && (
                    <p className="text-xs text-warning flex items-center gap-1">
                      <Edit2 className="h-3 w-3" />
                      Editing existing meals for this date
                    </p>
                  )}
                </div>

                {/* Member Meals List */}
                <div className="space-y-3 mt-4">
                  <AnimatePresence>
                    {members.map((member, index) => (
                      <motion.div
                        key={member.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="p-3 bg-muted/50 rounded-lg border"
                      >
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                              <span className="text-sm font-medium text-primary">
                                {member.fullName.charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <span className="font-medium text-sm">{member.fullName}</span>
                          </div>
                          <motion.div 
                            key={getMemberTotal(member.id)}
                            initial={{ scale: 1.2 }}
                            animate={{ scale: 1 }}
                            className="text-lg font-bold text-primary"
                          >
                            Total: {getMemberTotal(member.id)}
                          </motion.div>
                        </div>
                        
                        <div className="grid grid-cols-3 gap-2">
                          <div className="text-center">
                            <Label className="text-xs text-muted-foreground flex items-center justify-center gap-1 mb-1">
                              <Coffee className="h-3 w-3" /> breakfast
                            </Label>
                            <MealInput
                              value={memberMeals[member.id]?.breakfast || 0}
                              onChange={(v) => setMemberMealValue(member.id, 'breakfast', v)}
                              onIncrement={() => updateMemberMeal(member.id, 'breakfast', 0.5)}
                              onDecrement={() => updateMemberMeal(member.id, 'breakfast', -0.5)}
                            />
                          </div>
                          <div className="text-center">
                            <Label className="text-xs text-muted-foreground flex items-center justify-center gap-1 mb-1">
                              <Sun className="h-3 w-3" /> lunch
                            </Label>
                            <MealInput
                              value={memberMeals[member.id]?.lunch || 0}
                              onChange={(v) => setMemberMealValue(member.id, 'lunch', v)}
                              onIncrement={() => updateMemberMeal(member.id, 'lunch', 0.5)}
                              onDecrement={() => updateMemberMeal(member.id, 'lunch', -0.5)}
                            />
                          </div>
                          <div className="text-center">
                            <Label className="text-xs text-muted-foreground flex items-center justify-center gap-1 mb-1">
                              <Moon className="h-3 w-3" /> dinner
                            </Label>
                            <MealInput
                              value={memberMeals[member.id]?.dinner || 0}
                              onChange={(v) => setMemberMealValue(member.id, 'dinner', v)}
                              onIncrement={() => updateMemberMeal(member.id, 'dinner', 0.5)}
                              onDecrement={() => updateMemberMeal(member.id, 'dinner', -0.5)}
                            />
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>

                <DialogFooter className="mt-4">
                  <Button 
                    onClick={handleSubmitAll} 
                    className="w-full gradient-primary"
                    disabled={!isDateValidForAdding()}
                  >
                    {dateHasMeals(selectedDate) ? 'Update Meals' : 'Submit'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
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
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-medium text-muted-foreground sticky top-0 bg-background py-1">
                          {format(new Date(date), 'EEEE, MMMM d, yyyy')}
                        </h3>
                        {isManager && (
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => {
                              setSelectedDate(date);
                              setIsAddDialogOpen(true);
                            }}
                          >
                            <Edit2 className="h-4 w-4 mr-1" />
                            Edit Day
                          </Button>
                        )}
                      </div>
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
                                {canEdit && isManager && (
                                  <Button size="sm" variant="ghost" className="text-destructive" onClick={() => handleDelete(meal.id)}>
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
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
