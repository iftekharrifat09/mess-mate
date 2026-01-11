import { useEffect, useState, useRef } from 'react';
import { motion } from 'framer-motion';
import gsap from 'gsap';
import { useAuth } from '@/contexts/AuthContext';
import DashboardLayout from '@/components/layout/DashboardLayout';
import MonthSummaryCard from '@/components/dashboard/MonthSummaryCard';
import PersonalInfoCard from '@/components/dashboard/PersonalInfoCard';
import MemberSummaryCard from '@/components/dashboard/MemberSummaryCard';
import BazarDateCard from '@/components/dashboard/BazarDateCard';
import NoticePopup from '@/components/notices/NoticePopup';
import { MonthSummary, MemberSummary, BazarDate, User } from '@/types';
import { 
  calculateMonthSummary, 
  calculateMemberSummary, 
  getAllMembersSummary 
} from '@/lib/calculations';
import * as dataService from '@/lib/dataService';
import { Users } from 'lucide-react';

export default function Dashboard() {
  const { user } = useAuth();
  const [monthSummary, setMonthSummary] = useState<MonthSummary | null>(null);
  const [personalSummary, setPersonalSummary] = useState<MemberSummary | null>(null);
  const [membersSummary, setMembersSummary] = useState<MemberSummary[]>([]);
  const [messName, setMessName] = useState('');
  const [bazarDates, setBazarDates] = useState<BazarDate[]>([]);
  const [members, setMembers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const headerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (user) {
      loadDashboardData();
    }
  }, [user]);

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
      const mess = await dataService.getMessById(user.messId);
      if (mess) {
        setMessName(mess.name);
      }

      const messMembers = await dataService.getMessMembers(user.messId);
      setMembers(messMembers);

      const activeMonth = await dataService.getActiveMonth(user.messId);
      if (activeMonth) {
        const mSummary = await calculateMonthSummary(activeMonth.id, user.messId);
        setMonthSummary(mSummary);

        const pSummary = await calculateMemberSummary(user.id, activeMonth.id);
        setPersonalSummary(pSummary);

        const allMembers = await getAllMembersSummary(activeMonth.id, user.messId);
        setMembersSummary(allMembers);
      }

      const dates = await dataService.getBazarDatesByMessId(user.messId);
      setBazarDates(dates);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Loading dashboard...</p>
        </div>
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
