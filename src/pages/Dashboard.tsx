import { useEffect, useState, useRef, useCallback, useTransition, useMemo } from 'react';
import { CalcCategory, CalcException, CalcPayment } from '@/lib/calculatorStorage';
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
  calculateMonthSummary, 
  calculateMemberSummary, 
  getAllMembersSummary 
} from '@/lib/calculations';
import * as dataService from '@/lib/dataService';
import * as calcStore from '@/lib/calculatorStorage';
import { Users } from 'lucide-react';

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
      // Load all primary data in a single parallel batch
      const [mess, messMembers, activeMonth, dates] = await Promise.all([
        dataService.getMessById(user.messId),
        dataService.getMessMembers(user.messId),
        dataService.getActiveMonth(user.messId),
        dataService.getBazarDatesByMessId(user.messId),
      ]);

      // Set initial data immediately for faster perceived load
      startTransition(() => {
        if (mess) setMessName(mess.name);
        setMembers(messMembers || []);
        setBazarDates(dates || []);
      });

      if (activeMonth) {
        // Load calculations in parallel
        const [mSummary, pSummary, allMembers] = await Promise.all([
          calculateMonthSummary(activeMonth.id, user.messId),
          calculateMemberSummary(user.id, activeMonth.id),
          getAllMembersSummary(activeMonth.id, user.messId),
        ]);

        startTransition(() => {
          setMonthSummary(mSummary);
          setPersonalSummary(pSummary);
          setMembersSummary(allMembers);
        });

        // Load calc data for utility expenses
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
    // GSAP entrance animation for header
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
      {/* Notice Popup for Members */}
      {user?.role === 'member' && <NoticePopup />}
      
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="space-y-6"
      >
        {/* Header */}
        <div ref={headerRef}>
          <h1 className="text-3xl font-bold text-foreground">{messName}</h1>
          <p className="text-muted-foreground">
            Welcome back, {user?.fullName}! Here's your mess overview.
          </p>
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column - Month Summary */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
          >
            {monthSummary && <MonthSummaryCard summary={monthSummary} messId={user?.messId || ''} />}
          </motion.div>

          {/* Right Column - Personal Info */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
          >
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
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <DescoElectricityCard messId={user.messId} />
          </motion.div>
        )}

        {/* Bazar Dates - only show when there are upcoming/current dates */}
        {bazarDates.length > 0 && bazarDates.some(d => {
          const dateObj = new Date(d.date);
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          return dateObj >= today;
        }) && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
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

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4 }}
      className="space-y-4"
    >
      <div className="flex items-center gap-2">
        <Users className="h-5 w-5 text-primary" />
        <h2 className="text-xl font-semibold text-foreground">All Members</h2>
        <span className="text-sm text-muted-foreground">({membersSummary.length} members)</span>
      </div>

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
            // Crown logic: find single highest meal member
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
              />
            );
          })}
        </div>
      )}
    </motion.div>
  );
}
