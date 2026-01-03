import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MonthSummary } from '@/types';
import { formatCurrency, formatNumber } from '@/lib/calculations';
import { 
  Wallet, 
  TrendingUp, 
  Utensils, 
  Receipt, 
  DollarSign,
  Users,
  PiggyBank
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

interface MonthSummaryCardProps {
  summary: MonthSummary;
}

export default function MonthSummaryCard({ summary }: MonthSummaryCardProps) {
  return (
    <Card className="shadow-card">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Current Month</p>
            <CardTitle className="text-xl">{summary.monthName}</CardTitle>
          </div>
          <div className="p-3 rounded-xl gradient-primary">
            <Wallet className="h-6 w-6 text-primary-foreground" />
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <PiggyBank className="h-3 w-3" /> Mess Balance
            </p>
            <p className={`text-lg font-bold ${summary.messBalance >= 0 ? 'text-success' : 'text-destructive'}`}>
              {formatCurrency(summary.messBalance)}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <DollarSign className="h-3 w-3" /> Total Deposit
            </p>
            <p className="text-lg font-bold text-foreground">{formatCurrency(summary.totalDeposit)}</p>
          </div>
        </div>

        <div className="h-px bg-border" />

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Utensils className="h-3 w-3" /> Total Meals
            </p>
            <p className="text-lg font-bold text-foreground">{formatNumber(summary.totalMeals)}</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Receipt className="h-3 w-3" /> Total Meal Cost
            </p>
            <p className="text-lg font-bold text-foreground">{formatCurrency(summary.totalMealCost)}</p>
          </div>
        </div>

        <div className="p-3 rounded-lg bg-primary/5 border border-primary/10">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Meal Rate</span>
            <span className="text-lg font-bold text-primary">{formatCurrency(summary.mealRate)}/meal</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Individual Costs</p>
            <p className="text-sm font-semibold text-foreground">{formatCurrency(summary.totalIndividualCost)}</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Shared Costs</p>
            <p className="text-sm font-semibold text-foreground">{formatCurrency(summary.totalSharedCost)}</p>
          </div>
        </div>

        <Link to="/month-details">
          <Button variant="outline" className="w-full mt-2">
            View Full Details
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}
