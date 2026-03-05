import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MemberSummary } from '@/types';
import { formatCurrency, formatNumber } from '@/lib/calculations';
import { Utensils, Wallet, Receipt, TrendingUp, TrendingDown, User, CheckCircle } from 'lucide-react';

interface PersonalInfoCardProps {
  summary: MemberSummary;
  utilityExpenses?: number;
  utilityPaid?: number;
}

export default function PersonalInfoCard({ summary, utilityExpenses, utilityPaid }: PersonalInfoCardProps) {
  const totalCost = summary.mealCost + summary.individualCost + summary.sharedCost;
  const isFullyPaid = utilityExpenses !== undefined && utilityPaid !== undefined && (utilityExpenses > 0 ? utilityPaid >= utilityExpenses : true);

  return (
    <Card className="shadow-card border-primary/20 bg-gradient-to-br from-card to-primary/5">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">My Summary</p>
            <CardTitle className="text-xl">{summary.userName}</CardTitle>
          </div>
          <div className="p-3 rounded-xl gradient-accent">
            <User className="h-6 w-6 text-accent-foreground" />
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="p-3 rounded-lg bg-background/50">
            <div className="flex items-center gap-2 mb-1">
              <Utensils className="h-4 w-4 text-primary" />
              <span className="text-xs text-muted-foreground">My Meals</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{formatNumber(summary.totalMeals)}</p>
          </div>
          <div className="p-3 rounded-lg bg-background/50">
            <div className="flex items-center gap-2 mb-1">
              <Wallet className="h-4 w-4 text-success" />
              <span className="text-xs text-muted-foreground">My Deposit</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{formatCurrency(summary.totalDeposit)}</p>
          </div>
        </div>

        <div className="p-3 rounded-lg bg-background/50">
          <div className="flex items-center gap-2 mb-1">
            <Receipt className="h-4 w-4 text-warning" />
            <span className="text-xs text-muted-foreground">My Total Cost</span>
          </div>
          <p className="text-2xl font-bold text-foreground">{formatCurrency(totalCost)}</p>
          <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
            <span>Meal: {formatCurrency(summary.mealCost)}</span>
            <span>Individual: {formatCurrency(summary.individualCost)}</span>
            <span>Shared: {formatCurrency(summary.sharedCost)}</span>
          </div>
        </div>

        {/* Utility Expenses - only show when > 0 */}
        {utilityExpenses !== undefined && utilityExpenses > 0 && (
          <div className="p-3 rounded-lg bg-background/50">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                Utility Expenses: <span className="font-bold text-foreground">{formatCurrency(utilityExpenses)}</span>
              </span>
              {isFullyPaid ? (
                <div className="flex items-center gap-1.5">
                  <Badge className="bg-success text-success-foreground text-xs flex items-center gap-1">
                    <CheckCircle className="h-3 w-3" /> Paid
                  </Badge>
                  {utilityPaid !== undefined && utilityPaid > utilityExpenses && (
                    <span className="text-success font-semibold text-xs">+{formatCurrency(utilityPaid - utilityExpenses)}</span>
                  )}
                </div>
              ) : utilityPaid !== undefined && utilityExpenses > 0 ? (
                <span className="text-xs text-destructive font-semibold">Due: {formatCurrency(Math.max(0, utilityExpenses - utilityPaid))}</span>
              ) : null}
            </div>
          </div>
        )}

        <div className={`p-4 rounded-lg ${summary.balance >= 0 ? 'bg-success/10 border border-success/20' : 'bg-destructive/10 border border-destructive/20'}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {summary.balance >= 0 ? (
                <TrendingUp className="h-5 w-5 text-success" />
              ) : (
                <TrendingDown className="h-5 w-5 text-destructive" />
              )}
              <span className="text-sm font-medium">My Balance</span>
            </div>
            <span className={`text-2xl font-bold ${summary.balance >= 0 ? 'text-success' : 'text-destructive'}`}>
              {formatCurrency(summary.balance)}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
