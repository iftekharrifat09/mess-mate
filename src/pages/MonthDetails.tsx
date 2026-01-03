import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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
import { useToast } from '@/hooks/use-toast';
import { 
  getActiveMonth,
  getMonthsByMessId,
  createMonth,
  getMessMembers,
} from '@/lib/storage';
import { 
  calculateMonthSummary, 
  getAllMembersSummary, 
  formatCurrency, 
  formatNumber 
} from '@/lib/calculations';
import { Month, MonthSummary, MemberSummary } from '@/types';
import { CalendarDays, Plus, TrendingUp, TrendingDown } from 'lucide-react';

export default function MonthDetails() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeMonth, setActiveMonth] = useState<Month | null>(null);
  const [monthSummary, setMonthSummary] = useState<MonthSummary | null>(null);
  const [membersSummary, setMembersSummary] = useState<MemberSummary[]>([]);
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

            {/* Members Table */}
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
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
