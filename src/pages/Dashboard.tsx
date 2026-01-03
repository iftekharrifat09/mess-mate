import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import DashboardLayout from '@/components/layout/DashboardLayout';
import MonthSummaryCard from '@/components/dashboard/MonthSummaryCard';
import PersonalInfoCard from '@/components/dashboard/PersonalInfoCard';
import MemberSummaryCard from '@/components/dashboard/MemberSummaryCard';
import { MonthSummary, MemberSummary } from '@/types';
import { 
  calculateMonthSummary, 
  calculateMemberSummary, 
  getAllMembersSummary 
} from '@/lib/calculations';
import { getActiveMonth, getMessById } from '@/lib/storage';
import { Users } from 'lucide-react';

export default function Dashboard() {
  const { user } = useAuth();
  const [monthSummary, setMonthSummary] = useState<MonthSummary | null>(null);
  const [personalSummary, setPersonalSummary] = useState<MemberSummary | null>(null);
  const [membersSummary, setMembersSummary] = useState<MemberSummary[]>([]);
  const [messName, setMessName] = useState('');

  useEffect(() => {
    if (user) {
      loadDashboardData();
    }
  }, [user]);

  const loadDashboardData = () => {
    if (!user) return;

    const mess = getMessById(user.messId);
    if (mess) {
      setMessName(mess.name);
    }

    const activeMonth = getActiveMonth(user.messId);
    if (activeMonth) {
      const mSummary = calculateMonthSummary(activeMonth.id, user.messId);
      setMonthSummary(mSummary);

      const pSummary = calculateMemberSummary(user.id, activeMonth.id);
      setPersonalSummary(pSummary);

      const allMembers = getAllMembersSummary(activeMonth.id, user.messId);
      setMembersSummary(allMembers);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-foreground">{messName}</h1>
          <p className="text-muted-foreground">
            Welcome back, {user?.fullName}! Here's your mess overview.
          </p>
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column - Month Summary */}
          {monthSummary && <MonthSummaryCard summary={monthSummary} />}

          {/* Right Column - Personal Info */}
          {personalSummary && <PersonalInfoCard summary={personalSummary} />}
        </div>

        {/* All Members Section */}
        <div className="space-y-4">
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
              {membersSummary.map(member => (
                <MemberSummaryCard
                  key={member.userId}
                  summary={member}
                  isCurrentUser={member.userId === user?.id}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
