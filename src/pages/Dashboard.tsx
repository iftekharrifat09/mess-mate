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
        />
      </motion.div>
    </DashboardLayout>
  );
}

function MembersSectionWithDues({ membersSummary, members, messId, activeMonthId, userId, isManager, calcCategories, calcExceptions, calcPayments }: {
  membersSummary: MemberSummary[];
  members: User[];
  messId: string;
  activeMonthId: string;
  userId: string;
  isManager?: boolean;
  calcCategories: CalcCategory[];
  calcExceptions: CalcException[];
  calcPayments: CalcPayment[];
}) {
  const [includePrevBalance, setIncludePrevBalance] = useState(false);
  const [prevBalances, setPrevBalances] = useState<Record<string, number>>({});
  const [loadingPrev, setLoadingPrev] = useState(false);
  const [showConfirmOff, setShowConfirmOff] = useState(false);
  const [settingsLoaded, setSettingsLoaded] = useState(false);

  // Load toggle state from DB on mount
  useEffect(() => {
    if (!messId || !activeMonthId || settingsLoaded) return;
    const loadSettings = async () => {
      try {
        const result = await import('@/lib/api').then(api => api.getMessSettingsAPI(messId, activeMonthId));
        if (result.success && result.data) {
          const setting = (result.data as any).setting;
          setIncludePrevBalance(setting?.prevBalanceEnabled || false);
        }
      } catch {}
      setSettingsLoaded(true);
    };
    loadSettings();
  }, [messId, activeMonthId, settingsLoaded]);

  // Save toggle state to DB when changed
  useEffect(() => {
    if (!messId || !activeMonthId || !settingsLoaded) return;
    import('@/lib/api').then(api => {
      api.updateMessSettingsAPI({ messId, monthId: activeMonthId, prevBalanceEnabled: includePrevBalance }).catch(() => {});
    });
  }, [includePrevBalance, messId, activeMonthId, settingsLoaded]);

  // Load previous month balances when toggle is turned on
  useEffect(() => {
    if (!includePrevBalance || !messId || Object.keys(prevBalances).length > 0) return;

    const loadPrevMonth = async () => {
      setLoadingPrev(true);
      try {
        const allMonths = await dataService.getMonthsByMessId(messId);
        const inactiveMonths = allMonths
          .filter(m => !m.isActive)
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

        if (inactiveMonths.length === 0) {
          setPrevBalances({});
          return;
        }

        // Use the most recent previous month
        const prevMonth = inactiveMonths[0];
        
        // Check if adjusted balances were stored in DB for previous month
        const api = await import('@/lib/api');
        const prevSettingResult = await api.getMessSettingsAPI(messId, prevMonth.id);
        let storedAdjusted: Record<string, number> | null = null;
        if (prevSettingResult.success && prevSettingResult.data) {
          const prevSetting = (prevSettingResult.data as any).setting;
          if (prevSetting?.adjustedBalances) {
            storedAdjusted = prevSetting.adjustedBalances;
          }
        }

        const { fetchMonthData: fetchMD, getAllMembersSummaryFromData: getAllMS } = await import('@/lib/calculations');
        const monthData = await fetchMD(prevMonth.id, messId);
        const prevSummaries = getAllMS(monthData);

        const balances: Record<string, number> = {};
        prevSummaries.forEach(s => {
          if (storedAdjusted && storedAdjusted[s.userId] !== undefined) {
            balances[s.userId] = storedAdjusted[s.userId];
          } else {
            balances[s.userId] = s.balance;
          }
        });
        setPrevBalances(balances);
      } catch (error) {
        console.error('Error loading previous month balances:', error);
      } finally {
        setLoadingPrev(false);
      }
    };
    loadPrevMonth();
  }, [includePrevBalance, messId]);

  // Save adjusted balances to DB when toggle is ON
  useEffect(() => {
    if (!includePrevBalance || !activeMonthId || !messId || Object.keys(prevBalances).length === 0) return;
    const adjusted: Record<string, number> = {};
    membersSummary.forEach(m => {
      adjusted[m.userId] = m.balance + (prevBalances[m.userId] || 0);
    });
    import('@/lib/api').then(api => {
      api.updateMessSettingsAPI({ messId, monthId: activeMonthId, adjustedBalances: adjusted }).catch(() => {});
    });
  }, [includePrevBalance, membersSummary, prevBalances, activeMonthId, messId]);

  // Adjusted summaries when toggle is on
  const adjustedSummaries = useMemo(() => {
    if (!includePrevBalance || Object.keys(prevBalances).length === 0) return membersSummary;
    return membersSummary.map(member => ({
      ...member,
      balance: member.balance + (prevBalances[member.userId] || 0),
    }));
  }, [membersSummary, includePrevBalance, prevBalances]);

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

  const handleToggleChange = (checked: boolean) => {
    if (!isManager) return; // Members can't toggle
    if (!checked && includePrevBalance) {
      setShowConfirmOff(true);
    } else {
      setIncludePrevBalance(checked);
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
          <span className="text-sm text-muted-foreground">({adjustedSummaries.length} members)</span>
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
                    Previous Month +/−
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
              Are you sure you want to disable Previous Month +/− adjustment? Member balances will show only the current month values.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => {
              setIncludePrevBalance(false);
              setPrevBalances({});
              setShowConfirmOff(false);
            }}>
              Disable
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {adjustedSummaries.length === 0 ? (
        <div className="text-center py-12 bg-card rounded-lg border border-border">
          <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">No members in this mess yet.</p>
          {isManager && (
            <p className="text-sm text-muted-foreground mt-2">Add members from the Members page.</p>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {adjustedSummaries.map((member) => {
            const maxMeals = Math.max(...adjustedSummaries.map(m => m.totalMeals));
            const topMembers = adjustedSummaries.filter(m => m.totalMeals === maxMeals);
            const isMealKing = maxMeals > 0 && topMembers.length === 1 && member.userId === topMembers[0].userId;
            return (
              <MemberSummaryCard
                key={member.userId}
                summary={member}
                isCurrentUser={member.userId === userId}
                shouldPay={memberDues[member.userId]?.shouldPay}
                totalPaid={memberDues[member.userId]?.totalPaid}
                isMealKing={isMealKing}
                carryOverBalance={includePrevBalance ? (prevBalances[member.userId] || undefined) : undefined}
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