import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import * as dataService from '@/lib/dataService';
import { 
  calculateMonthSummary, 
  getAllMembersSummary, 
  formatCurrency, 
  formatNumber 
} from '@/lib/calculations';
import { exportToPDF, exportToExcel } from '@/lib/export';
import { Month, MonthSummary, MemberSummary, User, Meal, Deposit, MealCost, OtherCost } from '@/types';
import { CalendarDays, Plus, TrendingUp, TrendingDown, Download, FileText, FileSpreadsheet, History, Loader2 } from 'lucide-react';
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

interface PreviousMonthSummary {
  month: Month;
  summary: MonthSummary;
  membersSummary: MemberSummary[];
}

export default function MonthDetails() {
  const { user, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [activeMonth, setActiveMonth] = useState<Month | null>(null);
  const [monthSummary, setMonthSummary] = useState<MonthSummary | null>(null);
  const [membersSummary, setMembersSummary] = useState<MemberSummary[]>([]);
  const [dailyRecords, setDailyRecords] = useState<DailyRecord[]>([]);
  const [members, setMembers] = useState<User[]>([]);
  const [isNewMonthDialogOpen, setIsNewMonthDialogOpen] = useState(false);
  const [showPreviousMonths, setShowPreviousMonths] = useState(false);
  const [previousMonths, setPreviousMonths] = useState<PreviousMonthSummary[]>([]);
  const [isExporting, setIsExporting] = useState(false);
  const [confirmNewMonth, setConfirmNewMonth] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const isManager = user?.role === 'manager';

  useEffect(() => {
    if (!authLoading && user) {
      loadData();
    }
  }, [user, authLoading]);

  const loadData = async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      const month = await dataService.getActiveMonth(user.messId);
      setActiveMonth(month || null);
      
      if (month) {
        const summary = await calculateMonthSummary(month.id, user.messId);
        setMonthSummary(summary);
        
        const memSummary = await getAllMembersSummary(month.id, user.messId);
        setMembersSummary(memSummary);
        
        // Load daily records
        const messMembers = await dataService.getMessMembers(user.messId);
        setMembers(messMembers);
        
        const meals = await dataService.getMealsByMonthId(month.id);
        const deposits = await dataService.getDepositsByMonthId(month.id);
        const mealCosts = await dataService.getMealCostsByMonthId(month.id);
        const otherCosts = await dataService.getOtherCostsByMonthId(month.id);
        
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
      
      // Load previous months
      await loadPreviousMonths();
    } catch (error) {
      console.error('Error loading month details:', error);
      toast({
        title: 'Error',
        description: 'Failed to load month details',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const loadPreviousMonths = async () => {
    if (!user) return;
    
    try {
      const allMonths = await dataService.getMonthsByMessId(user.messId);
      const inactiveMonths = allMonths
        .filter(m => !m.isActive)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 6); // Last 6 months
      
      const summaries: PreviousMonthSummary[] = [];
      
      for (const month of inactiveMonths) {
        const summary = await calculateMonthSummary(month.id, user.messId);
        const membersSummary = await getAllMembersSummary(month.id, user.messId);
        summaries.push({ month, summary, membersSummary });
      }
      
      setPreviousMonths(summaries);
    } catch (error) {
      console.error('Error loading previous months:', error);
    }
  };

  const handleStartNewMonth = async () => {
    if (!user) return;

    const now = new Date();
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                        'July', 'August', 'September', 'October', 'November', 'December'];
    
    try {
      await dataService.createMonth({
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
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to start new month',
        variant: 'destructive',
      });
    }
  };

  const handleExportPDF = async () => {
    if (!activeMonth || !user) return;
    
    setIsExporting(true);
    
    try {
      const mess = await dataService.getMessById(user.messId);
      const meals = await dataService.getMealsByMonthId(activeMonth.id);
      const deposits = await dataService.getDepositsByMonthId(activeMonth.id);
      const mealCosts = await dataService.getMealCostsByMonthId(activeMonth.id);
      const otherCosts = await dataService.getOtherCostsByMonthId(activeMonth.id);
      
      exportToPDF({
        members,
        membersSummary,
        meals,
        deposits,
        mealCosts,
        otherCosts,
        monthName: activeMonth.name,
        messName: mess?.name || 'Mess',
      });
      
      toast({
        title: 'PDF Exported',
        description: 'Your report has been downloaded.',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to export PDF',
        variant: 'destructive',
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportExcel = async () => {
    if (!activeMonth || !user) return;
    
    setIsExporting(true);
    
    try {
      const mess = await dataService.getMessById(user.messId);
      const meals = await dataService.getMealsByMonthId(activeMonth.id);
      const deposits = await dataService.getDepositsByMonthId(activeMonth.id);
      const mealCosts = await dataService.getMealCostsByMonthId(activeMonth.id);
      const otherCosts = await dataService.getOtherCostsByMonthId(activeMonth.id);
      
      exportToExcel({
        members,
        membersSummary,
        meals,
        deposits,
        mealCosts,
        otherCosts,
        monthName: activeMonth.name,
        messName: mess?.name || 'Mess',
      });
      
      toast({
        title: 'Excel Exported',
        description: 'Your report has been downloaded.',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to export Excel',
        variant: 'destructive',
      });
    } finally {
      setIsExporting(false);
    }
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

  if (authLoading || isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  if (showPreviousMonths) {
    return (
      <DashboardLayout>
        <div className="space-y-6 animate-fade-in">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Previous Months</h1>
              <p className="text-muted-foreground">View last 6 months summary</p>
            </div>
            <Button variant="outline" onClick={() => setShowPreviousMonths(false)}>
              Back to Current Month
            </Button>
          </div>

          {previousMonths.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <History className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No previous months found.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              {previousMonths.map(({ month, summary, membersSummary: mSummary }) => (
                <Card key={month.id}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <CalendarDays className="h-5 w-5 text-primary" />
                      {month.name}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Summary Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="p-3 bg-muted/50 rounded-lg">
                        <p className="text-xs text-muted-foreground">Total Cost</p>
                        <p className="text-lg font-bold text-warning">
                          {formatCurrency(summary.totalMealCost + summary.totalSharedCost + summary.totalIndividualCost)}
                        </p>
                      </div>
                      <div className="p-3 bg-muted/50 rounded-lg">
                        <p className="text-xs text-muted-foreground">Total Meals</p>
                        <p className="text-lg font-bold text-foreground">{formatNumber(summary.totalMeals)}</p>
                      </div>
                      <div className="p-3 bg-muted/50 rounded-lg">
                        <p className="text-xs text-muted-foreground">Total Deposits</p>
                        <p className="text-lg font-bold text-success">{formatCurrency(summary.totalDeposit)}</p>
                      </div>
                      <div className="p-3 bg-muted/50 rounded-lg">
                        <p className="text-xs text-muted-foreground">Meal Rate</p>
                        <p className="text-lg font-bold text-primary">{formatCurrency(summary.mealRate)}</p>
                      </div>
                    </div>
                    
                    {/* Member-wise Summary */}
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Member</TableHead>
                            <TableHead className="text-right">Meals</TableHead>
                            <TableHead className="text-right">Deposit</TableHead>
                            <TableHead className="text-right">Balance</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {mSummary.map(member => (
                            <TableRow key={member.userId}>
                              <TableCell className="font-medium">{member.userName}</TableCell>
                              <TableCell className="text-right">{formatNumber(member.totalMeals)}</TableCell>
                              <TableCell className="text-right">{formatCurrency(member.totalDeposit)}</TableCell>
                              <TableCell className="text-right">
                                <span className={member.balance >= 0 ? 'text-success' : 'text-destructive'}>
                                  {formatCurrency(member.balance)}
                                </span>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Month Details</h1>
            <p className="text-muted-foreground">
              {activeMonth ? activeMonth.name : 'No active month'}
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            {previousMonths.length > 0 && (
              <Button variant="outline" onClick={() => setShowPreviousMonths(true)}>
                <History className="h-4 w-4 mr-2" />
                Previous Months
              </Button>
            )}
            
            {isManager && activeMonth && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" disabled={isExporting}>
                    <Download className="h-4 w-4 mr-2" />
                    Export
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onClick={handleExportPDF}>
                    <FileText className="h-4 w-4 mr-2" />
                    Export as PDF
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleExportExcel}>
                    <FileSpreadsheet className="h-4 w-4 mr-2" />
                    Export as Excel
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            
            {isManager && (
              <AlertDialog open={isNewMonthDialogOpen} onOpenChange={(open) => {
                setIsNewMonthDialogOpen(open);
                if (!open) setConfirmNewMonth('');
              }}>
                <AlertDialogTrigger asChild>
                  <Button className="gradient-primary">
                    <Plus className="h-4 w-4 mr-2" />
                    Start New Month
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Start New Month?</AlertDialogTitle>
                    <AlertDialogDescription className="space-y-3">
                      <p>This will close the current month and start a new one. All current month data will be preserved but the month will become inactive.</p>
                      <p className="font-medium pt-2">Type "Sure" below to confirm:</p>
                      <input
                        type="text"
                        value={confirmNewMonth}
                        onChange={(e) => setConfirmNewMonth(e.target.value)}
                        placeholder="Type Sure to confirm"
                        className="w-full px-3 py-2 border rounded-md bg-background text-foreground"
                      />
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel onClick={() => setConfirmNewMonth('')}>Cancel</AlertDialogCancel>
                    <AlertDialogAction 
                      onClick={handleStartNewMonth}
                      disabled={confirmNewMonth !== 'Sure'}
                      className={confirmNewMonth !== 'Sure' ? 'opacity-50 cursor-not-allowed' : ''}
                    >
                      Start New Month
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
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
