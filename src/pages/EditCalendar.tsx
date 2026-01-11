import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
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
import { Meal, Deposit, MealCost, OtherCost, User } from '@/types';
import { formatCurrency } from '@/lib/calculations';
import { Calendar, Edit2, ChevronLeft, ChevronRight, X, Save } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isBefore, isToday, addMonths, subMonths } from 'date-fns';

interface DayData {
  meals: Meal[];
  deposits: Deposit[];
  mealCosts: MealCost[];
  otherCosts: OtherCost[];
}

interface EditableData {
  meals: Record<string, { breakfast: number; lunch: number; dinner: number }>;
  deposits: Record<string, number>;
  mealCosts: Record<string, number>;
  otherCosts: Record<string, number>;
}

export default function EditCalendar() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [dayData, setDayData] = useState<DayData | null>(null);
  const [members, setMembers] = useState<User[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editableData, setEditableData] = useState<EditableData>({
    meals: {},
    deposits: {},
    mealCosts: {},
    otherCosts: {},
  });
  const [allData, setAllData] = useState<{
    meals: Meal[];
    deposits: Deposit[];
    mealCosts: MealCost[];
    otherCosts: OtherCost[];
  }>({ meals: [], deposits: [], mealCosts: [], otherCosts: [] });

  const isManager = user?.role === 'manager';

  useEffect(() => {
    loadData();
  }, [user]);

  const loadData = async () => {
    if (!user) return;
    
    try {
      const activeMonth = await dataService.getActiveMonth(user.messId);
      if (activeMonth) {
        const [meals, deposits, mealCosts, otherCosts] = await Promise.all([
          dataService.getMealsByMonthId(activeMonth.id),
          dataService.getDepositsByMonthId(activeMonth.id),
          dataService.getMealCostsByMonthId(activeMonth.id),
          dataService.getOtherCostsByMonthId(activeMonth.id),
        ]);
        setAllData({ meals, deposits, mealCosts, otherCosts });
      }
      const membersData = await dataService.getMessMembers(user.messId);
      setMembers(membersData);
    } catch (error) {
      console.error('Error loading calendar data:', error);
    }
  };

  const handleDateClick = (date: Date) => {
    if (isToday(date) || !isBefore(date, new Date())) return;
    
    const dateStr = format(date, 'yyyy-MM-dd');
    const data: DayData = {
      meals: allData.meals.filter(m => m.date === dateStr),
      deposits: allData.deposits.filter(d => d.date === dateStr),
      mealCosts: allData.mealCosts.filter(c => c.date === dateStr),
      otherCosts: allData.otherCosts.filter(c => c.date === dateStr),
    };
    
    // Initialize editable data
    const editable: EditableData = {
      meals: {},
      deposits: {},
      mealCosts: {},
      otherCosts: {},
    };
    
    data.meals.forEach(meal => {
      editable.meals[meal.id] = {
        breakfast: meal.breakfast,
        lunch: meal.lunch,
        dinner: meal.dinner,
      };
    });
    
    data.deposits.forEach(deposit => {
      editable.deposits[deposit.id] = deposit.amount;
    });
    
    data.mealCosts.forEach(cost => {
      editable.mealCosts[cost.id] = cost.amount;
    });
    
    data.otherCosts.forEach(cost => {
      editable.otherCosts[cost.id] = cost.amount;
    });
    
    setEditableData(editable);
    setDayData(data);
    setSelectedDate(date);
    setIsEditing(false);
    setIsDialogOpen(true);
  };

  const getMemberName = (userId: string) => {
    return members.find(m => m.id === userId)?.fullName || 'Unknown';
  };

  const days = eachDayOfInterval({
    start: startOfMonth(currentMonth),
    end: endOfMonth(currentMonth),
  });

  const firstDayOfWeek = startOfMonth(currentMonth).getDay();

  const getDayIndicator = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const hasActivity = 
      allData.meals.some(m => m.date === dateStr) ||
      allData.deposits.some(d => d.date === dateStr) ||
      allData.mealCosts.some(c => c.date === dateStr) ||
      allData.otherCosts.some(c => c.date === dateStr);
    return hasActivity;
  };

  const handleSaveChanges = async () => {
    if (!dayData) return;
    
    try {
      // Update meals
      await Promise.all(dayData.meals.map(async meal => {
        const mealData = editableData.meals[meal.id];
        if (mealData) {
          await dataService.updateMeal(meal.id, mealData);
        }
      }));
      
      // Update deposits - include original fields to prevent date reset
      await Promise.all(dayData.deposits.map(async deposit => {
        const amount = editableData.deposits[deposit.id];
        if (amount !== undefined) {
          await dataService.updateDeposit(deposit.id, { 
            amount,
            date: deposit.date,
            userId: deposit.userId,
            note: deposit.note || ''
          });
        }
      }));
      
      // Update meal costs - include original fields to prevent date reset
      await Promise.all(dayData.mealCosts.map(async cost => {
        const amount = editableData.mealCosts[cost.id];
        if (amount !== undefined) {
          await dataService.updateMealCost(cost.id, { 
            amount,
            date: cost.date,
            userId: cost.userId,
            description: cost.description || ''
          });
        }
      }));
      
      // Update other costs - include original fields to prevent date reset
      await Promise.all(dayData.otherCosts.map(async cost => {
        const amount = editableData.otherCosts[cost.id];
        if (amount !== undefined) {
          await dataService.updateOtherCost(cost.id, { 
            amount,
            date: cost.date,
            userId: cost.userId,
            description: cost.description || '',
            isShared: cost.isShared || false
          });
        }
      }));
      
      await loadData();
      setIsEditing(false);
      toast({ title: 'Changes saved successfully' });
    } catch (error) {
      console.error('Error saving changes:', error);
      toast({ title: 'Error saving changes', variant: 'destructive' });
    }
  };

  const handleDiscardChanges = () => {
    if (!dayData) return;
    
    // Reset editable data to original values
    const editable: EditableData = {
      meals: {},
      deposits: {},
      mealCosts: {},
      otherCosts: {},
    };
    
    dayData.meals.forEach(meal => {
      editable.meals[meal.id] = {
        breakfast: meal.breakfast,
        lunch: meal.lunch,
        dinner: meal.dinner,
      };
    });
    
    dayData.deposits.forEach(deposit => {
      editable.deposits[deposit.id] = deposit.amount;
    });
    
    dayData.mealCosts.forEach(cost => {
      editable.mealCosts[cost.id] = cost.amount;
    });
    
    dayData.otherCosts.forEach(cost => {
      editable.otherCosts[cost.id] = cost.amount;
    });
    
    setEditableData(editable);
    setIsEditing(false);
    toast({ title: 'Changes discarded' });
  };

  return (
    <DashboardLayout>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-6"
      >
        <div className="flex items-center justify-between">
          <div>
        <h1 className="text-3xl font-bold text-foreground">{isManager ? 'Edit Calendar' : 'Calendar View'}</h1>
            <p className="text-muted-foreground">
              {isManager ? 'Click on past dates to edit records' : 'Click on past dates to view records'}
            </p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-primary" />
                {format(currentMonth, 'MMMM yyyy')}
              </CardTitle>
              <div className="flex gap-2">
                <Button variant="outline" size="icon" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="icon" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {/* Calendar Header */}
            <div className="grid grid-cols-7 gap-1 mb-2">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                <div key={day} className="text-center text-sm font-medium text-muted-foreground p-2">
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-1">
              {/* Empty cells for days before start of month */}
              {Array.from({ length: firstDayOfWeek }).map((_, i) => (
                <div key={`empty-${i}`} className="aspect-square" />
              ))}

              {/* Days of the month */}
              {days.map((day) => {
                const isPastDate = isBefore(day, new Date()) && !isToday(day);
                const hasActivity = getDayIndicator(day);
                const isClickable = isPastDate;

                return (
                  <motion.button
                    key={day.toISOString()}
                    whileHover={isClickable ? { scale: 1.05 } : {}}
                    whileTap={isClickable ? { scale: 0.95 } : {}}
                    onClick={() => isClickable && handleDateClick(day)}
                    disabled={!isClickable}
                    className={`aspect-square rounded-lg flex flex-col items-center justify-center relative transition-colors ${
                      isToday(day)
                        ? 'bg-primary text-primary-foreground'
                        : isPastDate
                        ? 'bg-muted/50 hover:bg-muted cursor-pointer'
                        : 'bg-muted/20 text-muted-foreground cursor-not-allowed'
                    }`}
                  >
                    <span className="text-sm font-medium">{format(day, 'd')}</span>
                    {hasActivity && (
                      <span className={`absolute bottom-1 w-1.5 h-1.5 rounded-full ${
                        isToday(day) ? 'bg-primary-foreground' : 'bg-primary'
                      }`} />
                    )}
                  </motion.button>
                );
              })}
            </div>

            <div className="mt-4 flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-primary" />
                <span>Today</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                <span>Has Activity</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Day Details Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) setIsEditing(false);
        }}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <div className="flex items-center justify-between">
                <DialogTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-primary" />
                  {selectedDate && format(selectedDate, 'EEEE, MMMM d, yyyy')}
                </DialogTitle>
                {isManager && dayData && (dayData.meals.length > 0 || dayData.deposits.length > 0 || dayData.mealCosts.length > 0 || dayData.otherCosts.length > 0) && (
                  <div className="flex gap-2">
                    {!isEditing ? (
                      <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                        <Edit2 className="h-4 w-4 mr-1" />
                        Edit
                      </Button>
                    ) : (
                      <>
                        <Button variant="outline" size="sm" onClick={handleDiscardChanges}>
                          <X className="h-4 w-4 mr-1" />
                          Discard
                        </Button>
                        <Button size="sm" className="gradient-primary" onClick={handleSaveChanges}>
                          <Save className="h-4 w-4 mr-1" />
                          Save
                        </Button>
                      </>
                    )}
                  </div>
                )}
              </div>
            </DialogHeader>

            {dayData && (
              <div className="space-y-6">
                {/* Meals */}
                {dayData.meals.length > 0 && (
                  <div>
                    <h3 className="font-semibold mb-2">Meals</h3>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Member</TableHead>
                          <TableHead className="text-center">Breakfast</TableHead>
                          <TableHead className="text-center">Lunch</TableHead>
                          <TableHead className="text-center">Dinner</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {dayData.meals.map(meal => (
                          <TableRow key={meal.id}>
                            <TableCell>{getMemberName(meal.userId)}</TableCell>
                            <TableCell className="text-center">
                              {isEditing && isManager ? (
                                <Input
                                  type="number"
                                  min="0"
                                  step="0.5"
                                  value={editableData.meals[meal.id]?.breakfast ?? meal.breakfast}
                                  onChange={(e) => setEditableData(prev => ({
                                    ...prev,
                                    meals: {
                                      ...prev.meals,
                                      [meal.id]: {
                                        ...prev.meals[meal.id],
                                        breakfast: parseFloat(e.target.value) || 0,
                                      },
                                    },
                                  }))}
                                  className="w-16 text-center mx-auto"
                                />
                              ) : (
                                editableData.meals[meal.id]?.breakfast ?? meal.breakfast
                              )}
                            </TableCell>
                            <TableCell className="text-center">
                              {isEditing && isManager ? (
                                <Input
                                  type="number"
                                  min="0"
                                  step="0.5"
                                  value={editableData.meals[meal.id]?.lunch ?? meal.lunch}
                                  onChange={(e) => setEditableData(prev => ({
                                    ...prev,
                                    meals: {
                                      ...prev.meals,
                                      [meal.id]: {
                                        ...prev.meals[meal.id],
                                        lunch: parseFloat(e.target.value) || 0,
                                      },
                                    },
                                  }))}
                                  className="w-16 text-center mx-auto"
                                />
                              ) : (
                                editableData.meals[meal.id]?.lunch ?? meal.lunch
                              )}
                            </TableCell>
                            <TableCell className="text-center">
                              {isEditing && isManager ? (
                                <Input
                                  type="number"
                                  min="0"
                                  step="0.5"
                                  value={editableData.meals[meal.id]?.dinner ?? meal.dinner}
                                  onChange={(e) => setEditableData(prev => ({
                                    ...prev,
                                    meals: {
                                      ...prev.meals,
                                      [meal.id]: {
                                        ...prev.meals[meal.id],
                                        dinner: parseFloat(e.target.value) || 0,
                                      },
                                    },
                                  }))}
                                  className="w-16 text-center mx-auto"
                                />
                              ) : (
                                editableData.meals[meal.id]?.dinner ?? meal.dinner
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}

                {/* Deposits */}
                {dayData.deposits.length > 0 && (
                  <div>
                    <h3 className="font-semibold mb-2">Deposits</h3>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Member</TableHead>
                          <TableHead>Amount</TableHead>
                          <TableHead>Note</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {dayData.deposits.map(deposit => (
                          <TableRow key={deposit.id}>
                            <TableCell>{getMemberName(deposit.userId)}</TableCell>
                            <TableCell>
                              {isEditing && isManager ? (
                                <Input
                                  type="number"
                                  min="0"
                                  value={editableData.deposits[deposit.id] ?? deposit.amount}
                                  onChange={(e) => setEditableData(prev => ({
                                    ...prev,
                                    deposits: {
                                      ...prev.deposits,
                                      [deposit.id]: parseFloat(e.target.value) || 0,
                                    },
                                  }))}
                                  className="w-24"
                                />
                              ) : formatCurrency(editableData.deposits[deposit.id] ?? deposit.amount)}
                            </TableCell>
                            <TableCell>{deposit.note || '-'}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}

                {/* Meal Costs */}
                {dayData.mealCosts.length > 0 && (
                  <div>
                    <h3 className="font-semibold mb-2">Meal Costs</h3>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Purchased By</TableHead>
                          <TableHead>Description</TableHead>
                          <TableHead>Amount</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {dayData.mealCosts.map(cost => (
                          <TableRow key={cost.id}>
                            <TableCell>{getMemberName(cost.userId)}</TableCell>
                            <TableCell>{cost.description}</TableCell>
                            <TableCell>
                              {isEditing && isManager ? (
                                <Input
                                  type="number"
                                  min="0"
                                  value={editableData.mealCosts[cost.id] ?? cost.amount}
                                  onChange={(e) => setEditableData(prev => ({
                                    ...prev,
                                    mealCosts: {
                                      ...prev.mealCosts,
                                      [cost.id]: parseFloat(e.target.value) || 0,
                                    },
                                  }))}
                                  className="w-24"
                                />
                              ) : formatCurrency(editableData.mealCosts[cost.id] ?? cost.amount)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}

                {/* Other Costs */}
                {dayData.otherCosts.length > 0 && (
                  <div>
                    <h3 className="font-semibold mb-2">Other Costs</h3>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Paid By</TableHead>
                          <TableHead>Description</TableHead>
                          <TableHead>Amount</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {dayData.otherCosts.map(cost => (
                          <TableRow key={cost.id}>
                            <TableCell>{getMemberName(cost.userId)}</TableCell>
                            <TableCell>{cost.description}</TableCell>
                            <TableCell>
                              {isEditing && isManager ? (
                                <Input
                                  type="number"
                                  min="0"
                                  value={editableData.otherCosts[cost.id] ?? cost.amount}
                                  onChange={(e) => setEditableData(prev => ({
                                    ...prev,
                                    otherCosts: {
                                      ...prev.otherCosts,
                                      [cost.id]: parseFloat(e.target.value) || 0,
                                    },
                                  }))}
                                  className="w-24"
                                />
                              ) : formatCurrency(editableData.otherCosts[cost.id] ?? cost.amount)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}

                {dayData.meals.length === 0 && dayData.deposits.length === 0 && 
                 dayData.mealCosts.length === 0 && dayData.otherCosts.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    No records for this date
                  </div>
                )}
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </motion.div>
    </DashboardLayout>
  );
}
