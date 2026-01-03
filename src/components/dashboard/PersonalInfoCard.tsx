import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MemberSummary } from '@/types';
import { formatCurrency, formatNumber } from '@/lib/calculations';
import { Utensils, Wallet, Receipt, TrendingUp, TrendingDown, User } from 'lucide-react';

interface PersonalInfoCardProps {
  summary: MemberSummary;
}

export default function PersonalInfoCard({ summary }: PersonalInfoCardProps) {
  const totalCost = summary.mealCost + summary.individualCost + summary.sharedCost;

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
