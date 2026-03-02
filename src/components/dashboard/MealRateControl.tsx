import { useMemo, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Meal, MealCost } from '@/types';
import { Target, TrendingDown, Calendar, Users, AlertTriangle } from 'lucide-react';

interface MealRateControlProps {
  meals: Meal[];
  mealCosts: MealCost[];
  totalDeposit: number;
  memberCount: number;
  monthYear: { month: number; year: number }; // 0-indexed month
}

export default function MealRateControl({
  meals, mealCosts, totalDeposit, memberCount, monthYear
}: MealRateControlProps) {
  const [targetRate, setTargetRate] = useState<string>('');

  const analysis = useMemo(() => {
    const target = parseFloat(targetRate);
    if (!target || target <= 0) return null;

    const totalMealCost = mealCosts.reduce((s, c) => s + c.amount, 0);
    const totalMeals = meals.reduce((s, m) => s + m.breakfast + m.lunch + m.dinner, 0);
    const currentRate = totalMeals > 0 ? totalMealCost / totalMeals : 0;

    // Remaining days
    const now = new Date();
    const daysInMonth = new Date(monthYear.year, monthYear.month + 1, 0).getDate();
    
    // Get unique dates with meals to find elapsed days
    const mealDates = new Set(meals.map(m => m.date));
    const elapsedDays = mealDates.size || 1;
    const remainingDays = Math.max(daysInMonth - now.getDate(), 1);

    // Average meals per day so far
    const avgMealsPerDay = totalMeals / elapsedDays;
    
    // Predicted remaining meals
    const predictedRemainingMeals = avgMealsPerDay * remainingDays;
    const predictedTotalMeals = totalMeals + predictedRemainingMeals;

    // Required total cost to achieve target rate
    const requiredTotalCost = target * predictedTotalMeals;
    const remainingBudget = requiredTotalCost - totalMealCost;
    const dailySpendingLimit = Math.max(remainingBudget / remainingDays, 0);

    // Predicted end-of-month meal rate if spending continues at daily limit
    const predictedEndRate = predictedTotalMeals > 0
      ? (totalMealCost + (dailySpendingLimit * remainingDays)) / predictedTotalMeals
      : 0;

    // Average meals per member per day to maintain target
    const avgMealPerMemberPerDay = memberCount > 0
      ? avgMealsPerDay / memberCount
      : 0;

    // Check if target is achievable
    const isOverspent = remainingBudget < 0;
    const budgetAvailable = totalDeposit - totalMealCost;

    return {
      currentRate: parseFloat(currentRate.toFixed(2)),
      totalMealCost: parseFloat(totalMealCost.toFixed(2)),
      totalMeals,
      remainingDays,
      dailySpendingLimit: parseFloat(dailySpendingLimit.toFixed(2)),
      predictedEndRate: parseFloat(predictedEndRate.toFixed(2)),
      avgMealPerMemberPerDay: parseFloat(avgMealPerMemberPerDay.toFixed(2)),
      isOverspent,
      budgetAvailable: parseFloat(budgetAvailable.toFixed(2)),
      requiredTotalCost: parseFloat(requiredTotalCost.toFixed(2)),
      remainingBudget: parseFloat(remainingBudget.toFixed(2)),
    };
  }, [targetRate, meals, mealCosts, totalDeposit, memberCount, monthYear]);

  return (
    <div className="space-y-4">
      {/* Input */}
      <div className="space-y-2">
        <Label htmlFor="meal-rate-limit" className="text-sm font-medium flex items-center gap-2">
          <Target className="h-4 w-4 text-accent" />
          Meal Rate Limit (৳)
        </Label>
        <Input
          id="meal-rate-limit"
          type="number"
          placeholder="e.g. 120"
          value={targetRate}
          onChange={e => setTargetRate(e.target.value)}
          className="max-w-xs"
          min={0}
          step={0.01}
        />
        <p className="text-[11px] text-muted-foreground">
          Enter your desired meal rate to see spending recommendations.
        </p>
      </div>

      {/* Analysis Results */}
      {analysis && (
        <div className="space-y-3">
          {analysis.isOverspent && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/30">
              <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
              <p className="text-xs text-destructive">
                Current spending already exceeds the target rate. You would need to reduce spending significantly or increase meals to achieve ৳{targetRate}/meal.
              </p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-2">
            <ResultCard
              icon={<TrendingDown className="h-3.5 w-3.5" />}
              label="Suggested Daily Spending"
              value={`৳${analysis.dailySpendingLimit}`}
              highlight
            />
            <ResultCard
              icon={<Calendar className="h-3.5 w-3.5" />}
              label="Remaining Days"
              value={`${analysis.remainingDays} days`}
            />
            <ResultCard
              icon={<Target className="h-3.5 w-3.5" />}
              label="Predicted End Rate"
              value={`৳${analysis.predictedEndRate}`}
              color={
                analysis.predictedEndRate <= parseFloat(targetRate) * 1.05
                  ? 'text-[hsl(142,71%,45%)]'
                  : 'text-[hsl(0,84%,60%)]'
              }
            />
            <ResultCard
              icon={<Users className="h-3.5 w-3.5" />}
              label="Avg Meal/Member/Day"
              value={`${analysis.avgMealPerMemberPerDay} meals`}
            />
          </div>

          {/* Summary text */}
          <div className="p-3 rounded-lg bg-muted/50 border border-border text-xs text-muted-foreground space-y-1.5">
            <p>
              To maintain a meal rate of <span className="font-semibold text-foreground">৳{targetRate}</span>,
              you should spend approximately <span className="font-semibold text-foreground">৳{analysis.dailySpendingLimit}</span> per day
              for the remaining <span className="font-semibold text-foreground">{analysis.remainingDays}</span> days.
            </p>
            <p>
              Each member should consume approximately <span className="font-semibold text-foreground">{analysis.avgMealPerMemberPerDay}</span> meals per day.
            </p>
            <p className="text-[10px] pt-1 border-t border-border/50">
              Current: ৳{analysis.currentRate}/meal • Total spent: ৳{analysis.totalMealCost} • Budget remaining: ৳{analysis.budgetAvailable}
            </p>
          </div>
        </div>
      )}

      {!analysis && (
        <p className="text-center text-muted-foreground py-6 text-sm">
          Enter a target meal rate to see analysis.
        </p>
      )}
    </div>
  );
}

function ResultCard({ icon, label, value, highlight, color }: {
  icon: React.ReactNode;
  label: string;
  value: string;
  highlight?: boolean;
  color?: string;
}) {
  return (
    <div className={`p-2.5 rounded-lg border border-border text-center ${highlight ? 'bg-accent/10' : 'bg-muted/50'}`}>
      <div className="flex items-center justify-center gap-1 mb-1 text-muted-foreground">
        {icon}
        <p className="text-[10px] uppercase tracking-wider">{label}</p>
      </div>
      <p className={`text-sm sm:text-base font-bold ${color || 'text-foreground'}`}>{value}</p>
    </div>
  );
}
