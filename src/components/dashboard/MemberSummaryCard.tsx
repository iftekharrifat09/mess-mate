import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MemberSummary } from '@/types';
import { formatCurrency, formatNumber } from '@/lib/calculations';
import { Utensils, Wallet, Receipt, TrendingUp, TrendingDown, Crown } from 'lucide-react';

interface MemberSummaryCardProps {
  summary: MemberSummary;
  isCurrentUser?: boolean;
  isHighestMeals?: boolean;
}

const getBalanceStatus = (balance: number) => {
  if (balance <= 0) return { status: 'danger', color: 'border-destructive/50 bg-destructive/5', icon: 'text-destructive' };
  if (balance <= 500) return { status: 'warning', color: 'border-warning/50 bg-warning/5', icon: 'text-warning' };
  return { status: 'success', color: 'border-success/50 bg-success/5', icon: 'text-success' };
};

export default function MemberSummaryCard({ summary, isCurrentUser = false, isHighestMeals = false }: MemberSummaryCardProps) {
  const totalCost = summary.mealCost + summary.individualCost + summary.sharedCost;
  const balanceStatus = getBalanceStatus(summary.balance);

  if (isHighestMeals && summary.totalMeals > 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        whileHover={{ scale: 1.02, transition: { duration: 0.2 } }}
      >
        <Card className={`relative overflow-hidden shadow-lg hover:shadow-xl transition-all ${isCurrentUser ? 'ring-2 ring-amber-400' : ''}`}
          style={{
            background: 'linear-gradient(135deg, #fffbe6 0%, #ffe066 40%, #ffcc00 70%, #ffb300 100%)',
            borderColor: '#e6ac00',
            borderWidth: '1.5px',
          }}
        >
          {/* Shimmer overlay */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <div className="golden-shimmer absolute inset-0" />
          </div>

          {/* Crown icon */}
          <div className="absolute top-3 right-3 z-10">
            <motion.div
              animate={{ rotate: [0, -5, 5, 0] }}
              transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
            >
              <Crown className="h-6 w-6 drop-shadow-md" style={{ color: '#b8860b' }} fill="#e6ac00" />
            </motion.div>
          </div>

          <CardHeader className="pb-3 relative z-10">
            <div className="flex items-center justify-between pr-8">
              <CardTitle className="text-lg font-semibold" style={{ color: '#5c3d00' }}>
                {summary.userName}
                {isCurrentUser && (
                  <span className="ml-2 text-xs font-normal" style={{ color: '#8b6914' }}>(You)</span>
                )}
              </CardTitle>
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              >
                {summary.balance >= 0 ? (
                  <div className="flex items-center gap-1 text-sm font-semibold" style={{ color: '#2d6a1e' }}>
                    <TrendingUp className="h-4 w-4" />
                    <span>+{formatCurrency(summary.balance)}</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1 text-sm font-semibold" style={{ color: '#b91c1c' }}>
                    <TrendingDown className="h-4 w-4" />
                    <span>{formatCurrency(summary.balance)}</span>
                  </div>
                )}
              </motion.div>
            </div>
          </CardHeader>
          <CardContent className="relative z-10">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-md" style={{ backgroundColor: 'rgba(139, 105, 20, 0.15)' }}>
                  <Utensils className="h-3.5 w-3.5" style={{ color: '#8b6914' }} />
                </div>
                <div>
                  <p className="text-xs" style={{ color: '#7a5c1f' }}>Meals</p>
                  <p className="font-semibold" style={{ color: '#5c3d00' }}>{formatNumber(summary.totalMeals)}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-md" style={{ backgroundColor: 'rgba(139, 105, 20, 0.15)' }}>
                  <Receipt className="h-3.5 w-3.5" style={{ color: '#8b6914' }} />
                </div>
                <div>
                  <p className="text-xs" style={{ color: '#7a5c1f' }}>Meal Cost</p>
                  <p className="font-semibold" style={{ color: '#5c3d00' }}>{formatCurrency(summary.mealCost)}</p>
                </div>
              </div>
            </div>

            <div className="mt-3 pt-3" style={{ borderTop: '1px solid rgba(139, 105, 20, 0.2)' }}>
              <div className="flex justify-between text-xs" style={{ color: '#7a5c1f' }}>
                <span>Individual: {formatCurrency(summary.individualCost)}</span>
                <span>Shared: {formatCurrency(summary.sharedCost)}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.02, transition: { duration: 0.2 } }}
    >
      <Card className={`shadow-card hover:shadow-card-hover transition-all ${balanceStatus.color} ${isCurrentUser ? 'ring-2 ring-primary' : ''}`}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-semibold">
              {summary.userName}
              {isCurrentUser && (
                <span className="ml-2 text-xs font-normal text-primary">(You)</span>
              )}
            </CardTitle>
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 500, damping: 30 }}
            >
              {summary.balance >= 0 ? (
                <div className={`flex items-center gap-1 ${balanceStatus.icon} text-sm font-semibold`}>
                  <TrendingUp className="h-4 w-4" />
                  <span>+{formatCurrency(summary.balance)}</span>
                </div>
              ) : (
                <div className={`flex items-center gap-1 ${balanceStatus.icon} text-sm font-semibold`}>
                  <TrendingDown className="h-4 w-4" />
                  <span>{formatCurrency(summary.balance)}</span>
                </div>
              )}
            </motion.div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-md bg-primary/10">
                <Utensils className="h-3.5 w-3.5 text-primary" />
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Meals</p>
                <p className="font-semibold">{formatNumber(summary.totalMeals)}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-md bg-success/10">
                <Wallet className="h-3.5 w-3.5 text-success" />
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Deposit</p>
                <p className="font-semibold">{formatCurrency(summary.totalDeposit)}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-md bg-warning/10">
                <Receipt className="h-3.5 w-3.5 text-warning" />
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Meal Cost</p>
                <p className="font-semibold">{formatCurrency(summary.mealCost)}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-md bg-muted">
                <Receipt className="h-3.5 w-3.5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Total Cost</p>
                <p className="font-semibold">{formatCurrency(totalCost)}</p>
              </div>
            </div>
          </div>

          <div className="mt-3 pt-3 border-t border-border">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Individual: {formatCurrency(summary.individualCost)}</span>
              <span className="text-muted-foreground">Shared: {formatCurrency(summary.sharedCost)}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
