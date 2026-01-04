import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Users,
  Utensils,
  Wallet,
  ShoppingCart,
  Receipt,
  CalendarDays,
  UserPlus,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Menu,
  Building,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState } from 'react';

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  managerOnly?: boolean;
}

const navItems: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Members', href: '/members', icon: Users },
  { label: 'Meals', href: '/meals', icon: Utensils },
  { label: 'Deposits', href: '/deposits', icon: Wallet, managerOnly: true },
  { label: 'Meal Costs', href: '/meal-costs', icon: ShoppingCart, managerOnly: true },
  { label: 'Other Costs', href: '/other-costs', icon: Receipt, managerOnly: true },
  { label: 'Month Details', href: '/month-details', icon: CalendarDays },
  { label: 'Join Requests', href: '/join-requests', icon: UserPlus, managerOnly: true },
  { label: 'Manage Mess', href: '/manage-mess', icon: Building, managerOnly: true },
];

export default function Sidebar() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const isManager = user?.role === 'manager';

  const filteredNavItems = navItems.filter(item => !item.managerOnly || isManager);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <>
      {/* Mobile menu button */}
      <Button
        variant="ghost"
        size="icon"
        className="fixed top-4 left-4 z-50 lg:hidden"
        onClick={() => setIsMobileOpen(!isMobileOpen)}
      >
        <Menu className="h-5 w-5" />
      </Button>

      {/* Mobile overlay */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed left-0 top-0 z-40 h-screen bg-sidebar text-sidebar-foreground transition-all duration-300 flex flex-col',
          isCollapsed ? 'w-20' : 'w-64',
          isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-sidebar-border">
          {!isCollapsed && (
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center">
                <Utensils className="w-5 h-5 text-primary-foreground" />
              </div>
              <div>
                <h2 className="font-bold text-sidebar-foreground">Mess Manager</h2>
                <p className="text-xs text-sidebar-muted capitalize">{user?.role}</p>
              </div>
            </div>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="hidden lg:flex text-sidebar-foreground hover:bg-sidebar-accent"
            onClick={() => setIsCollapsed(!isCollapsed)}
          >
            {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </Button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          {filteredNavItems.map(item => {
            const Icon = item.icon;
            const isActive = location.pathname === item.href;

            return (
              <Link
                key={item.href}
                to={item.href}
                onClick={() => setIsMobileOpen(false)}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors',
                  isActive
                    ? 'bg-sidebar-primary text-sidebar-primary-foreground'
                    : 'text-sidebar-foreground hover:bg-sidebar-accent'
                )}
              >
                <Icon className={cn('h-5 w-5 flex-shrink-0', isCollapsed && 'mx-auto')} />
                {!isCollapsed && <span className="font-medium">{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-sidebar-border space-y-2">
          {!isCollapsed && (
            <div className="px-3 py-2 rounded-lg bg-sidebar-accent">
              <p className="font-medium text-sidebar-foreground truncate">{user?.fullName}</p>
              <p className="text-xs text-sidebar-muted truncate">{user?.email}</p>
            </div>
          )}
          <Button
            variant="ghost"
            className={cn(
              'w-full text-sidebar-foreground hover:bg-sidebar-accent',
              isCollapsed ? 'justify-center px-0' : 'justify-start'
            )}
            onClick={handleLogout}
          >
            <LogOut className="h-5 w-5" />
            {!isCollapsed && <span className="ml-3">Logout</span>}
          </Button>
        </div>
      </aside>
    </>
  );
}
