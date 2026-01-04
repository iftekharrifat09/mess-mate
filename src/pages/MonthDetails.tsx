import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { 
  getActiveMonth,
  createMonth,
  getMessMembers,
  getMealsByMonthId,
  getDepositsByMonthId,
  getMealCostsByMonthId,
  getOtherCostsByMonthId,
} from '@/lib/storage';
import { 
  calculateMonthSummary, 
  getAllMembersSummary, 
  formatCurrency, 
  formatNumber 
} from '@/lib/calculations';
import { Month, MonthSummary, MemberSummary, User, Meal, Deposit, MealCost, OtherCost } from '@/types';
import { CalendarDays, Plus, TrendingUp, TrendingDown } from 'lucide-react';
import { format } from 'date-fns';

interface DailyRecord {
  date: string;
  memberId: string;
  memberName: string;
  meals: number;
  deposit: number;
  mealCost: number;
  otherCost: number;
}

export default function MonthDetails() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeMonth, setActiveMonth] = useState<Month | null>(null);
  const [monthSummary, setMonthSummary] = useState<MonthSummary | null>(null);
  const [membersSummary, setMembersSummary] = useState<MemberSummary[]>([]);
  const [dailyRecords, setDailyRecords] = useState<DailyRecord[]>([]);
  const [members, setMembers] = useState<User[]>([]);
  const [isNewMonthDialogOpen, setIsNewMonthDialogOpen] = useState(false);

  const isManager = user?.role === 'manager';

  useEffect(() => {
    loadData();
  }, [user]);

  const loadData = () => {
    if (!user) return;
    
    const month = getActiveMonth(user.messId);
    setActiveMonth(month || null);
    
    if (month) {
      setMonthSummary(calculateMonthSummary(month.id, user.messId));
      setMembersSummary(getAllMembersSummary(month.id, user.messId));
      
      // Load daily records
      const messMembers = getMessMembers(user.messId);
      setMembers(messMembers);
      
      const meals = getMealsByMonthId(month.id);
      const deposits = getDepositsByMonthId(month.id);
      const mealCosts = getMealCostsByMonthId(month.id);
      const otherCosts = getOtherCostsByMonthId(month.id);
      
      // Get all unique dates
      const allDates = new Set<string>();
      meals.forEach(m => allDates.add(m.date));
      deposits.forEach(d => allDates.add(d.date));
      mealCosts.forEach(c => allDates.add(c.date));
      otherCosts.forEach(c => allDates.add(c.date));
      
      // Create daily records for each member and date
      const records: DailyRecord[] = [];
      
      Array.from(allDates).sort((a, b) => new Date(b).getTime() - new Date(a).getTime()).forEach(date => {
        messMembers.forEach(member => {
          const memberMeals = meals.filter(m => m.date === date && m.userId === member.id);
          const memberDeposits = deposits.filter(d => d.date === date && d.userId === member.id);
          const memberMealCosts = mealCosts.filter(c => c.date === date && c.userId === member.id);
          const memberOtherCosts = otherCosts.filter(c => c.date === date && c.userId === member.id);
          
          const totalMeals = memberMeals.reduce((sum, m) => sum + m.breakfast + m.lunch + m.dinner, 0);
          const totalDeposit = memberDeposits.reduce((sum, d) => sum + d.amount, 0);
          const totalMealCost = memberMealCosts.reduce((sum, c) => sum + c.amount, 0);
          const totalOtherCost = memberOtherCosts.reduce((sum, c) => sum + c.amount, 0);
          
          // Only add if there's any activity
          if (totalMeals > 0 || totalDeposit > 0 || totalMealCost > 0 || totalOtherCost > 0) {
            records.push({
              date,
              memberId: member.id,
              memberName: member.fullName,
              meals: totalMeals,
              deposit: totalDeposit,
              mealCost: totalMealCost,
              otherCost: totalOtherCost,
            });
          }
        });
      });
      
      setDailyRecords(records);
    }
  };

  const handleStartNewMonth = () => {
    if (!user) return;

    const now = new Date();
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                        'July', 'August', 'September', 'October', 'November', 'December'];
    
    createMonth({
      messId: user.messId,
      name: `${monthNames[now.getMonth()]} ${now.getFullYear()}`,
      year: now.getFullYear(),
      month: now.getMonth() + 1,
      isActive: true,
    });

    toast({
      title: 'New month started',
      description: 'A new month has been created and is now active.',
    });

    setIsNewMonthDialogOpen(false);
    loadData();
  };

  // Group daily records by date for summary view
  const dailyTotals = dailyRecords.reduce((acc, record) => {
    if (!acc[record.date]) {
      acc[record.date] = { meals: 0, deposit: 0, mealCost: 0, otherCost: 0 };
    }
    acc[record.date].meals += record.meals;
    acc[record.date].deposit += record.deposit;
    acc[record.date].mealCost += record.mealCost;
    acc[record.date].otherCost += record.otherCost;
    return acc;
  }, {} as Record<string, { meals: number; deposit: number; mealCost: number; otherCost: number }>);

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Month Details</h1>
            <p className="text-muted-foreground">
              {activeMonth ? activeMonth.name : 'No active month'}
            </p>
          </div>
          {isManager && (
            <AlertDialog open={isNewMonthDialogOpen} onOpenChange={setIsNewMonthDialogOpen}>
              <AlertDialogTrigger asChild>
                <Button className="gradient-primary">
                  <Plus className="h-4 w-4 mr-2" />
                  Start New Month
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Start New Month?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will close the current month and start a new one. All current month data will be preserved but the month will become inactive.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleStartNewMonth}>
                    Start New Month
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>

        {!activeMonth ? (
          <Card>
            <CardContent className="text-center py-12">
              <CalendarDays className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No active month.</p>
              {isManager && (
                <Button className="mt-4" onClick={() => setIsNewMonthDialogOpen(true)}>
                  Start First Month
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Summary Cards */}
            {monthSummary && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="pt-6">
                    <p className="text-sm text-muted-foreground">Mess Balance</p>
                    <p className={`text-2xl font-bold ${monthSummary.messBalance >= 0 ? 'text-success' : 'text-destructive'}`}>
                      {formatCurrency(monthSummary.messBalance)}
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <p className="text-sm text-muted-foreground">Total Deposit</p>
                    <p className="text-2xl font-bold text-foreground">
                      {formatCurrency(monthSummary.totalDeposit)}
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <p className="text-sm text-muted-foreground">Total Meals</p>
                    <p className="text-2xl font-bold text-foreground">
                      {formatNumber(monthSummary.totalMeals)}
                    </p>
                  </CardContent>
                </Card>
                <Card className="bg-primary/5 border-primary/20">
                  <CardContent className="pt-6">
                    <p className="text-sm text-muted-foreground">Meal Rate</p>
                    <p className="text-2xl font-bold text-primary">
                      {formatCurrency(monthSummary.mealRate)}
                    </p>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Cost Summary Cards */}
            {monthSummary && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardContent className="pt-6">
                    <p className="text-sm text-muted-foreground">Total Meal Cost</p>
                    <p className="text-2xl font-bold text-warning">
                      {formatCurrency(monthSummary.totalMealCost)}
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <p className="text-sm text-muted-foreground">Total Shared Cost</p>
                    <p className="text-2xl font-bold text-info">
                      {formatCurrency(monthSummary.totalSharedCost)}
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <p className="text-sm text-muted-foreground">Total Individual Cost</p>
                    <p className="text-2xl font-bold text-foreground">
                      {formatCurrency(monthSummary.totalIndividualCost)}
                    </p>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Tabs for Members Summary and Daily Details */}
            <Tabs defaultValue="members" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="members">Members Summary</TabsTrigger>
                <TabsTrigger value="daily">Daily Details</TabsTrigger>
              </TabsList>
              
              <TabsContent value="members">
                <Card>
                  <CardHeader>
                    <CardTitle>Members Summary</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {membersSummary.length === 0 ? (
                      <div className="text-center py-12">
                        <p className="text-muted-foreground">No members in this mess.</p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Member</TableHead>
                              <TableHead className="text-right">Meals</TableHead>
                              <TableHead className="text-right">Deposit</TableHead>
                              <TableHead className="text-right">Meal Cost</TableHead>
                              <TableHead className="text-right">Individual</TableHead>
                              <TableHead className="text-right">Shared</TableHead>
                              <TableHead className="text-right">Balance</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {membersSummary.map(member => (
                              <TableRow key={member.userId} className={member.userId === user?.id ? 'bg-primary/5' : ''}>
                                <TableCell className="font-medium">
                                  {member.userName}
                                  {member.userId === user?.id && (
                                    <span className="ml-2 text-xs text-primary">(You)</span>
                                  )}
                                </TableCell>
                                <TableCell className="text-right">{formatNumber(member.totalMeals)}</TableCell>
                                <TableCell className="text-right">{formatCurrency(member.totalDeposit)}</TableCell>
                                <TableCell className="text-right">{formatCurrency(member.mealCost)}</TableCell>
                                <TableCell className="text-right">{formatCurrency(member.individualCost)}</TableCell>
                                <TableCell className="text-right">{formatCurrency(member.sharedCost)}</TableCell>
                                <TableCell className="text-right">
                                  <div className={`flex items-center justify-end gap-1 font-semibold ${member.balance >= 0 ? 'text-success' : 'text-destructive'}`}>
                                    {member.balance >= 0 ? (
                                      <TrendingUp className="h-4 w-4" />
                                    ) : (
                                      <TrendingDown className="h-4 w-4" />
                                    )}
                                    {formatCurrency(member.balance)}
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
              </TabsContent>
              
              <TabsContent value="daily">
                <Card>
                  <CardHeader>
                    <CardTitle>Daily Details</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {dailyRecords.length === 0 ? (
                      <div className="text-center py-12">
                        <p className="text-muted-foreground">No daily records yet.</p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Date</TableHead>
                              <TableHead>Member</TableHead>
                              <TableHead className="text-right">Meals</TableHead>
                              <TableHead className="text-right">Deposit</TableHead>
                              <TableHead className="text-right">Meal Cost</TableHead>
                              <TableHead className="text-right">Other Cost</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {dailyRecords.map((record, index) => (
                              <TableRow key={`${record.date}-${record.memberId}`} className={record.memberId === user?.id ? 'bg-primary/5' : ''}>
                                <TableCell>{format(new Date(record.date), 'MMM dd, yyyy')}</TableCell>
                                <TableCell className="font-medium">
                                  {record.memberName}
                                  {record.memberId === user?.id && (
                                    <span className="ml-2 text-xs text-primary">(You)</span>
                                  )}
                                </TableCell>
                                <TableCell className="text-right">{formatNumber(record.meals)}</TableCell>
                                <TableCell className="text-right text-success">
                                  {record.deposit > 0 ? formatCurrency(record.deposit) : '-'}
                                </TableCell>
                                <TableCell className="text-right text-warning">
                                  {record.mealCost > 0 ? formatCurrency(record.mealCost) : '-'}
                                </TableCell>
                                <TableCell className="text-right text-info">
                                  {record.otherCost > 0 ? formatCurrency(record.otherCost) : '-'}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
