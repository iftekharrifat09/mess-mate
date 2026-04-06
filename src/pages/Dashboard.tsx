import { useEffect, useState, useRef, useCallback, useTransition, useMemo } from 'react';
import { CalcCategory, CalcException, CalcPayment } from '@/lib/calculatorStorage';
import { Switch } from '@/components/ui/switch';
import { motion } from 'framer-motion';
import gsap from 'gsap';
import { useAuth } from '@/contexts/AuthContext';
import DashboardLayout from '@/components/layout/DashboardLayout';
import MonthSummaryCard from '@/components/dashboard/MonthSummaryCard';
import PersonalInfoCard from '@/components/dashboard/PersonalInfoCard';
import MemberSummaryCard from '@/components/dashboard/MemberSummaryCard';
import BazarDateCard from '@/components/dashboard/BazarDateCard';
import DescoElectricityCard from '@/components/dashboard/DescoElectricityCard';
import NoticePopup from '@/components/notices/NoticePopup';
import { LoadingSkeleton } from '@/components/ui/loading-skeleton';
import { MonthSummary, MemberSummary, BazarDate, User } from '@/types';
import { 
  fetchMonthData,
  calculateMonthSummaryFromData, 
  calculateMemberSummaryFromData, 
  getAllMembersSummaryFromData 
} from '@/lib/calculations';
import * as dataService from '@/lib/dataService';
import * as calcStore from '@/lib/calculatorStorage';
import { Users, Loader2, Lock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import CalendarModal from '@/components/dashboard/CalendarModal';
import { toBanglaDate, toBanglaDigits, toHijriDate, ENGLISH_MONTHS } from '@/lib/dateConversions';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

const AUTO_DEPOSIT_NOTE = 'Auto Previous Month +/- Adjustment';

// Default empty states to show UI immediately
const EMPTY_MONTH_SUMMARY: MonthSummary = {
  monthId: '',
  monthName: 'No Active Month',
  messBalance: 0,
  totalDeposit: 0,
  totalMeals: 0,
  totalMealCost: 0,
  mealRate: 0,
  totalIndividualCost: 0,
  totalSharedCost: 0,
};

export default function Dashboard() {
  const { user, isLoading: authLoading } = useAuth();
  const [monthSummary, setMonthSummary] = useState<MonthSummary | null>(null);
  const [personalSummary, setPersonalSummary] = useState<MemberSummary | null>(null);
  const [membersSummary, setMembersSummary] = useState<MemberSummary[]>([]);
  const [messName, setMessName] = useState('');
  const [bazarDates, setBazarDates] = useState<BazarDate[]>([]);
  const [members, setMembers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [calcCategories, setCalcCategories] = useState<CalcCategory[]>([]);
  const [calcExceptions, setCalcExceptions] = useState<CalcException[]>([]);
  const [calcPayments, setCalcPayments] = useState<CalcPayment[]>([]);
  const [isPending, startTransition] = useTransition();
  const headerRef = useRef<HTMLDivElement>(null);
  const dataLoadedRef = useRef(false);

  const loadDashboardData = useCallback(async () => {
    if (!user || dataLoadedRef.current) return;
    
    try {
      const [mess, activeMonth, dates] = await Promise.all([
        dataService.getMessById(user.messId),
        dataService.getActiveMonth(user.messId),
        dataService.getBazarDatesByMessId(user.messId),
      ]);

      startTransition(() => {
        if (mess) setMessName(mess.name);
        setBazarDates(dates || []);
      });

      if (activeMonth) {
        const monthData = await fetchMonthData(activeMonth.id, user.messId);
        const mSummary = calculateMonthSummaryFromData(activeMonth.id, monthData);
        const pSummary = calculateMemberSummaryFromData(user.id, monthData);
        const allMembers = getAllMembersSummaryFromData(monthData);

        startTransition(() => {
          setMonthSummary(mSummary);
          setPersonalSummary(pSummary);
          setMembersSummary(allMembers);
          setMembers(monthData.members);
        });

        if (user.messId && activeMonth.id) {
          const [cats, excs, pays] = await Promise.all([
            calcStore.getCategories(user.messId, activeMonth.id),
            calcStore.getAllExceptions(user.messId, activeMonth.id),
            calcStore.getPayments(user.messId, activeMonth.id),
          ]);
          setCalcCategories(cats);
          setCalcExceptions(excs);
          setCalcPayments(pays);
        }
      } else {
        startTransition(() => {
          setMonthSummary(EMPTY_MONTH_SUMMARY);
          setPersonalSummary({
            userId: user.id,
            userName: user.fullName || 'Unknown',
            totalMeals: 0,
            totalDeposit: 0,
            mealCost: 0,
            individualCost: 0,
            sharedCost: 0,
            balance: 0,
          });
          setMembersSummary([]);
        });
      }
      
      dataLoadedRef.current = true;
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Reload data when needed (after toggle changes deposits)
  const reloadDashboardData = useCallback(async () => {
    if (!user) return;
    dataLoadedRef.current = false;
    setLoading(false); // Don't show full skeleton
    await loadDashboardData();
  }, [user, loadDashboardData]);

  useEffect(() => {
    if (!authLoading && user) {
      loadDashboardData();
    }
  }, [user, authLoading, loadDashboardData]);

  useEffect(() => {
    if (headerRef.current && messName) {
      gsap.fromTo(
        headerRef.current.children,
        { opacity: 0, y: -20 },
        { opacity: 1, y: 0, stagger: 0.1, duration: 0.4, ease: 'power2.out' }
      );
    }
  }, [messName]);

  if (authLoading || loading) {
    return (
      <DashboardLayout>
        <LoadingSkeleton type="dashboard" />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      {user?.role === 'member' && <NoticePopup />}
      
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="space-y-6"
      >
        {/* Header */}
        <div ref={headerRef} className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">{messName}</h1>
            <p className="text-muted-foreground">
              Welcome back, {user?.fullName}! Here's your mess overview.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <TodayDateDisplay />
            <CalendarModal />
          </div>
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }}>
            {monthSummary && <MonthSummaryCard summary={monthSummary} messId={user?.messId || ''} />}
          </motion.div>
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}>
            {personalSummary && (
              <PersonalInfoCard
                summary={personalSummary}
                utilityExpenses={(() => {
                  if (!user?.messId || !monthSummary?.monthId) return undefined;
                  return calcStore.calculateMemberDues(calcCategories, calcExceptions, members.length, user.id);
                })()}
                utilityPaid={(() => {
                  if (!user?.messId || !monthSummary?.monthId) return undefined;
                  return calcPayments.filter(p => p.userId === user.id).reduce((s, p) => s + p.amount, 0);
                })()}
              />
            )}
          </motion.div>
        </div>

        {/* DESCO Electricity */}
        {user?.messId && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
            <DescoElectricityCard messId={user.messId} />
          </motion.div>
        )}

        {/* Bazar Dates */}
        {bazarDates.length > 0 && bazarDates.some(d => {
          const dateObj = new Date(d.date);
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          return dateObj >= today;
        }) && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
            <BazarDateCard bazarDates={bazarDates} members={members} />
          </motion.div>
        )}

        {/* All Members Section */}
        <MembersSectionWithDues
          membersSummary={membersSummary}
          members={members}
          messId={user?.messId || ''}
          activeMonthId={monthSummary?.monthId || ''}
          userId={user?.id || ''}
          isManager={user?.role === 'manager'}
          calcCategories={calcCategories}
          calcExceptions={calcExceptions}
          calcPayments={calcPayments}
          onDataChanged={reloadDashboardData}
        />
      </motion.div>
    </DashboardLayout>
  );
}

function MembersSectionWithDues({ membersSummary, members, messId, activeMonthId, userId, isManager, calcCategories, calcExceptions, calcPayments, onDataChanged }: {
  membersSummary: MemberSummary[];
  members: User[];
  messId: string;
  activeMonthId: string;
  userId: string;
  isManager?: boolean;
  calcCategories: CalcCategory[];
  calcExceptions: CalcException[];
  calcPayments: CalcPayment[];
  onDataChanged?: () => void;
}) {
  const { toast } = useToast();
  const [includePrevBalance, setIncludePrevBalance] = useState(false);
  const [loadingPrev, setLoadingPrev] = useState(false);
  const [showConfirmOff, setShowConfirmOff] = useState(false);
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const [autoDepositAmounts, setAutoDepositAmounts] = useState<Record<string, number>>({});

  // Load toggle state from DB on mount
  useEffect(() => {
    if (!messId || !activeMonthId || settingsLoaded) return;
    const loadSettings = async () => {
      try {
        const setting = await dataService.getMessSettings(messId, activeMonthId);
        const enabled = setting?.prevBalanceEnabled || false;
        setIncludePrevBalance(enabled);
        if (enabled) {
          // Load auto deposit amounts for carry-over display
          const deposits = await dataService.getDepositsByMonthId(activeMonthId);
          const autoAmounts: Record<string, number> = {};
          deposits.filter(d => d.note === AUTO_DEPOSIT_NOTE).forEach(d => {
            autoAmounts[d.userId] = (autoAmounts[d.userId] || 0) + d.amount;
          });
          setAutoDepositAmounts(autoAmounts);
        }
      } catch {}
      setSettingsLoaded(true);
    };
    loadSettings();
  }, [messId, activeMonthId, settingsLoaded]);

  const memberDues = useMemo(() => {
    if (!messId || !activeMonthId) return {};
    const totalMembers = members.length;
    const dues: Record<string, { shouldPay: number; totalPaid: number }> = {};
    for (const m of members) {
      const shouldPay = calcStore.calculateMemberDues(calcCategories, calcExceptions, totalMembers, m.id);
      const totalPaid = calcPayments.filter(p => p.userId === m.id).reduce((s, p) => s + p.amount, 0);
      dues[m.id] = { shouldPay, totalPaid };
    }
    return dues;
  }, [messId, activeMonthId, members, calcCategories, calcExceptions, calcPayments]);

  const handleToggleChange = async (checked: boolean) => {
    if (!isManager) return;
    if (!checked && includePrevBalance) {
      setShowConfirmOff(true);
      return;
    }
    if (checked) {
      await enablePrevBalance();
    }
  };

  const enablePrevBalance = async () => {
    if (!messId || !activeMonthId) return;
    setLoadingPrev(true);

    try {
      // Get previous month balances
      const allMonths = await dataService.getMonthsByMessId(messId);
      const inactiveMonths = allMonths
        .filter(m => !m.isActive)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      if (inactiveMonths.length === 0) {
        toast({ title: 'No previous month found', variant: 'destructive' });
        setLoadingPrev(false);
        return;
      }

      const prevMonth = inactiveMonths[0];

      // Check stored adjusted balances first
      let storedAdjusted: Record<string, number> | null = null;
      const prevSetting = await dataService.getMessSettings(messId, prevMonth.id);
      if (prevSetting?.adjustedBalances) {
        storedAdjusted = prevSetting.adjustedBalances;
      }

      const { fetchMonthData: fetchMD, getAllMembersSummaryFromData: getAllMS } = await import('@/lib/calculations');
      const monthData = await fetchMD(prevMonth.id, messId);
      const prevSummaries = getAllMS(monthData);

      // First, remove any existing auto deposits to prevent duplicates
      const currentDeposits = await dataService.getDepositsByMonthId(activeMonthId);
      const existingAutoDeposits = currentDeposits.filter(d => d.note === AUTO_DEPOSIT_NOTE);
      for (const dep of existingAutoDeposits) {
        await dataService.deleteDeposit(dep.id);
      }

      // Create auto deposit entries for each member
      const today = format(new Date(), 'yyyy-MM-dd');
      for (const s of prevSummaries) {
        let balance = 0;
        if (storedAdjusted && storedAdjusted[s.userId] !== undefined) {
          balance = storedAdjusted[s.userId];
        } else {
          balance = s.balance;
        }
        if (balance === 0) continue;

        await dataService.createDeposit({
          monthId: activeMonthId,
          userId: s.userId,
          amount: balance, // positive or negative
          date: today,
          note: AUTO_DEPOSIT_NOTE,
        });
      }

      // Save toggle state
      setIncludePrevBalance(true);
      await dataService.updateMessSettings({ messId, monthId: activeMonthId, prevBalanceEnabled: true });

      // Update auto deposit amounts for carry-over display
      const updatedDeposits = await dataService.getDepositsByMonthId(activeMonthId);
      const autoAmounts: Record<string, number> = {};
      updatedDeposits.filter(d => d.note === AUTO_DEPOSIT_NOTE).forEach(d => {
        autoAmounts[d.userId] = (autoAmounts[d.userId] || 0) + d.amount;
      });
      setAutoDepositAmounts(autoAmounts);

      toast({ title: 'Previous month adjustments applied as deposits', variant: 'success' });

      // Reload dashboard data to reflect new deposits
      onDataChanged?.();
    } catch (error) {
      console.error('Error enabling prev balance:', error);
      toast({ title: 'Error applying adjustments', variant: 'destructive' });
    } finally {
      setLoadingPrev(false);
    }
  };

  const disablePrevBalance = async () => {
    if (!messId || !activeMonthId) return;
    setLoadingPrev(true);
    setShowConfirmOff(false);

    try {
      // Delete only auto-generated deposits
      const currentDeposits = await dataService.getDepositsByMonthId(activeMonthId);
      const autoDeposits = currentDeposits.filter(d => d.note === AUTO_DEPOSIT_NOTE);
      for (const dep of autoDeposits) {
        await dataService.deleteDeposit(dep.id);
      }

      setIncludePrevBalance(false);
      setAutoDepositAmounts({});
      await dataService.updateMessSettings({ messId, monthId: activeMonthId, prevBalanceEnabled: false, adjustedBalances: null });

      toast({ title: 'Previous month adjustments removed', variant: 'success' });
      onDataChanged?.();
    } catch (error) {
      console.error('Error disabling prev balance:', error);
      toast({ title: 'Error removing adjustments', variant: 'destructive' });
    } finally {
      setLoadingPrev(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4 }}
      className="space-y-4"
    >
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-semibold text-foreground">All Members</h2>
          <span className="text-sm text-muted-foreground">({membersSummary.length} members)</span>
        </div>
        <div className="flex items-center gap-2 sm:ml-auto">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={includePrevBalance}
                    onCheckedChange={handleToggleChange}
                    disabled={loadingPrev || !isManager}
                    id="prev-balance-toggle"
                  />
                  <label
                    htmlFor="prev-balance-toggle"
                    className="text-xs sm:text-sm font-medium text-muted-foreground cursor-pointer select-none"
                  >
                    Previous Month Adjustment
                  </label>
                  {!isManager && (
                    <Lock className="h-3 w-3 text-muted-foreground" />
                  )}
                </div>
              </TooltipTrigger>
              {!isManager && (
                <TooltipContent>
                  <p>Only Manager can control this</p>
                </TooltipContent>
              )}
            </Tooltip>
          </TooltipProvider>
          {includePrevBalance && (
            <Badge variant="outline" className="text-xs border-success/50 text-success animate-pulse">
              Active
            </Badge>
          )}
          {loadingPrev && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
        </div>
      </div>

      {/* Confirmation dialog for turning off */}
      <AlertDialog open={showConfirmOff} onOpenChange={setShowConfirmOff}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Disable Previous Month Adjustment?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove all auto-generated deposit entries from the previous month adjustment. Manual deposits will remain unchanged.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={disablePrevBalance}>
              {loadingPrev ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
              Disable
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {membersSummary.length === 0 ? (
        <div className="text-center py-12 bg-card rounded-lg border border-border">
          <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">No members in this mess yet.</p>
          {isManager && (
            <p className="text-sm text-muted-foreground mt-2">Add members from the Members page.</p>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {membersSummary.map((member) => {
            const maxMeals = Math.max(...membersSummary.map(m => m.totalMeals));
            const topMembers = membersSummary.filter(m => m.totalMeals === maxMeals);
            const isMealKing = maxMeals > 0 && topMembers.length === 1 && member.userId === topMembers[0].userId;
            return (
              <MemberSummaryCard
                key={member.userId}
                summary={member}
                isCurrentUser={member.userId === userId}
                shouldPay={memberDues[member.userId]?.shouldPay}
                totalPaid={memberDues[member.userId]?.totalPaid}
                isMealKing={isMealKing}
                prevMonthActive={includePrevBalance}
                carryOverAmount={includePrevBalance ? (autoDepositAmounts[member.userId] || 0) : undefined}
              />
            );
          })}
        </div>
      )}
    </motion.div>
  );
}

function TodayDateDisplay() {
  const today = new Date();
  const bangla = toBanglaDate(today);
  const hijri = toHijriDate(today);
  const englishDate = `${today.getDate()} ${ENGLISH_MONTHS[today.getMonth()]} ${today.getFullYear()}`;

  return (
    <motion.div
      initial={{ opacity: 0, x: 10 }}
      animate={{ opacity: 1, x: 0 }}
      className="hidden sm:flex flex-col items-end text-right bg-card/50 backdrop-blur-sm border border-border/50 rounded-lg px-3 py-2"
    >
      <span className="text-xs font-medium text-foreground">{englishDate}</span>
      <span className="text-xs font-bold text-primary">
        {toBanglaDigits(bangla.day)} {bangla.month} {toBanglaDigits(bangla.year)}
      </span>
      <span className="text-xs font-bold text-gold">
        {hijri.day} {hijri.month} {hijri.year} AH
      </span>
    </motion.div>
  );
}
