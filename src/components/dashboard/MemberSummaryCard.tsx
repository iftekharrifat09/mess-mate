import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MemberSummary } from '@/types';
import { formatCurrency, formatNumber } from '@/lib/calculations';
import { Utensils, Wallet, Receipt, TrendingUp, TrendingDown, CheckCircle, Crown } from 'lucide-react';

interface MemberSummaryCardProps {
  summary: MemberSummary;
  isCurrentUser?: boolean;
  shouldPay?: number;
  totalPaid?: number;
  isMealKing?: boolean;
}

const getBalanceStatus = (balance: number) => {
  if (balance <= 0) return { status: 'danger', color: 'border-destructive/50 bg-destructive/5', icon: 'text-destructive' };
  if (balance <= 500) return { status: 'warning', color: 'border-warning/50 bg-warning/5', icon: 'text-warning' };
  return { status: 'success', color: 'border-success/50 bg-success/5', icon: 'text-success' };
};

export default function MemberSummaryCard({ summary, isCurrentUser = false, shouldPay, totalPaid, isMealKing = false }: MemberSummaryCardProps) {
  const totalCost = summary.mealCost + summary.individualCost + summary.sharedCost;
  const balanceStatus = getBalanceStatus(summary.balance);
  const isFullyPaid = shouldPay !== undefined && totalPaid !== undefined && (shouldPay > 0 ? totalPaid >= shouldPay : true);
  const overpaid = isFullyPaid && totalPaid !== undefined && shouldPay !== undefined && totalPaid > shouldPay ? totalPaid - shouldPay : 0;
  const showUtility = shouldPay !== undefined && shouldPay > 0;
  const showIndividualShared = summary.individualCost > 0 || summary.sharedCost > 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.02, transition: { duration: 0.2 } }}
      className={isMealKing ? 'relative' : ''}
    >
      {isMealKing && (
        <>
          {/* Animated golden glow layers */}
          <div className="absolute -inset-[2px] rounded-xl bg-gradient-to-r from-yellow-400 via-amber-300 to-yellow-500 opacity-60 blur-sm animate-pulse pointer-events-none" />
          <div className="absolute -inset-[1px] rounded-xl bg-gradient-to-br from-yellow-400/80 via-amber-200/40 to-yellow-500/80 pointer-events-none" />
        </>
      )}
      <Card className={`relative shadow-card hover:shadow-card-hover transition-all ${balanceStatus.color} ${isCurrentUser ? 'ring-2 ring-primary' : ''} ${isMealKing ? 'border-yellow-400/50 bg-gradient-to-br from-yellow-50/30 via-card to-amber-50/20 dark:from-yellow-900/15 dark:via-card dark:to-amber-900/10' : ''}`}
        style={isMealKing ? { boxShadow: '0 0 25px 4px rgba(234, 179, 8, 0.2), 0 0 60px 8px rgba(234, 179, 8, 0.08)' } : undefined}
      >
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 min-w-0">
              {isMealKing && (
                <Crown className="h-5 w-5 flex-shrink-0" style={{ color: '#eab308', filter: 'drop-shadow(0 0 4px rgba(234,179,8,0.5))' }} />
              )}
              <CardTitle className="text-lg font-semibold truncate">
                {summary.userName}
                {isCurrentUser && (
                  <span className="ml-2 text-xs font-normal text-primary">(You)</span>
                )}
              </CardTitle>
            </div>
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              className="flex-shrink-0"
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

          {/* Utility Expenses - only show when > 0 */}
          {showUtility && (
            <div className="mt-3 pt-3 border-t border-border">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">
                  Utility Expenses: <span className="font-semibold text-foreground">{formatCurrency(shouldPay!)}</span>
                </span>
                {isFullyPaid ? (
                  <div className="flex items-center gap-1.5">
                    <Badge className="bg-success text-success-foreground text-xs flex items-center gap-1">
                      <CheckCircle className="h-3 w-3" /> Paid
                    </Badge>
                    {overpaid > 0 && (
                      <span className="text-success font-semibold text-xs">+{formatCurrency(overpaid)}</span>
                    )}
                  </div>
                ) : totalPaid !== undefined && shouldPay! > 0 ? (
                  <span className="text-destructive font-semibold">Due: {formatCurrency(Math.max(0, shouldPay! - totalPaid))}</span>
                ) : null}
              </div>
            </div>
          )}

          {/* Individual & Shared - only show when at least one > 0 */}
          {showIndividualShared && (
            <div className="mt-3 pt-3 border-t border-border">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Individual: {formatCurrency(summary.individualCost)}</span>
                <span className="text-muted-foreground">Shared: {formatCurrency(summary.sharedCost)}</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
