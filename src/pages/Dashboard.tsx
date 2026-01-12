import { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import gsap from 'gsap';
import { useAuth } from '@/contexts/AuthContext';
import DashboardLayout from '@/components/layout/DashboardLayout';
import MonthSummaryCard from '@/components/dashboard/MonthSummaryCard';
import PersonalInfoCard from '@/components/dashboard/PersonalInfoCard';
import MemberSummaryCard from '@/components/dashboard/MemberSummaryCard';
import BazarDateCard from '@/components/dashboard/BazarDateCard';
import NoticePopup from '@/components/notices/NoticePopup';
import { LoadingSkeleton } from '@/components/ui/loading-skeleton';
import { MonthSummary, MemberSummary, BazarDate, User } from '@/types';
import { 
  calculateMonthSummary, 
  calculateMemberSummary, 
  getAllMembersSummary 
} from '@/lib/calculations';
import * as dataService from '@/lib/dataService';
import { Users } from 'lucide-react';

export default function Dashboard() {
  const { user, isLoading: authLoading } = useAuth();
  const [monthSummary, setMonthSummary] = useState<MonthSummary | null>(null);
  const [personalSummary, setPersonalSummary] = useState<MemberSummary | null>(null);
  const [membersSummary, setMembersSummary] = useState<MemberSummary[]>([]);
  const [messName, setMessName] = useState('');
  const [bazarDates, setBazarDates] = useState<BazarDate[]>([]);
  const [members, setMembers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const headerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!authLoading && user) {
      loadDashboardData();
    }
  }, [user, authLoading]);

  useEffect(() => {
    // GSAP entrance animation for header
    if (headerRef.current && messName) {
      gsap.fromTo(
        headerRef.current.children,
        { opacity: 0, y: -20 },
        { opacity: 1, y: 0, stagger: 0.1, duration: 0.5, ease: 'power2.out' }
      );
    }
  }, [messName]);

  const loadDashboardData = async () => {
    if (!user) return;
    setLoading(true);

    try {
      console.log('Loading dashboard data for user:', user.id, 'messId:', user.messId);
      
      // Load data in parallel for better performance
      const [mess, messMembers, activeMonth, dates] = await Promise.all([
        dataService.getMessById(user.messId),
        dataService.getMessMembers(user.messId),
        dataService.getActiveMonth(user.messId),
        dataService.getBazarDatesByMessId(user.messId),
      ]);

      console.log('Parallel load complete - Mess:', mess, 'Members:', messMembers?.length, 'Month:', activeMonth);

      if (mess) {
        setMessName(mess.name);
      }

      setMembers(messMembers || []);
      setBazarDates(dates || []);

      if (activeMonth) {
        // Load month-related data in parallel
        const [mSummary, pSummary, allMembers] = await Promise.all([
          calculateMonthSummary(activeMonth.id, user.messId),
          calculateMemberSummary(user.id, activeMonth.id),
          getAllMembersSummary(activeMonth.id, user.messId),
        ]);

        console.log('Month data loaded - Summary:', mSummary);
        setMonthSummary(mSummary);
        setPersonalSummary(pSummary);
        setMembersSummary(allMembers);
      } else {
        console.log('No active month found - creating empty summaries');
        // Still show empty summaries even if no active month
        setMonthSummary({
          monthId: '',
          monthName: 'No Active Month',
          messBalance: 0,
          totalDeposit: 0,
          totalMeals: 0,
          totalMealCost: 0,
          mealRate: 0,
          totalIndividualCost: 0,
          totalSharedCost: 0,
        });
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
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

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
            {monthSummary && <MonthSummaryCard summary={monthSummary} />}
          </motion.div>

          {/* Right Column - Personal Info */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
          >
            {personalSummary && <PersonalInfoCard summary={personalSummary} />}
          </motion.div>
        </div>

        {/* Bazar Dates */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <BazarDateCard bazarDates={bazarDates} members={members} />
        </motion.div>

        {/* All Members Section */}
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
              {user?.role === 'manager' && (
                <p className="text-sm text-muted-foreground mt-2">
                  Add members from the Members page.
                </p>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {membersSummary.map((member, index) => (
                <MemberSummaryCard
                  key={member.userId}
                  summary={member}
                  isCurrentUser={member.userId === user?.id}
                />
              ))}
            </div>
          )}
        </motion.div>
      </motion.div>
    </DashboardLayout>
  );
}
