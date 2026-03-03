import { useMemo, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Meal, MealCost } from '@/types';
import { Target, TrendingDown, Calendar, Users, AlertTriangle, DollarSign, Utensils } from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, ReferenceLine
} from 'recharts';

interface MealRateControlProps {
  meals: Meal[];
  mealCosts: MealCost[];
  totalDeposit: number;
  memberCount: number;
  monthYear: { month: number; year: number }; // 0-indexed month
}

interface RateDataPoint {
  date: string;
  label: string;
  currentRate: number | null;
  targetRate: number | null;
}

export default function MealRateControl({
  meals, mealCosts, totalDeposit, memberCount, monthYear
}: MealRateControlProps) {
  const [targetRate, setTargetRate] = useState<string>('');

  // Build daily cumulative data for graph
  const dailyData = useMemo(() => {
    if (!meals.length || !mealCosts.length) return [];

    const mealsByDate = new Map<string, number>();
    meals.forEach(m => {
      const total = m.breakfast + m.lunch + m.dinner;
      mealsByDate.set(m.date, (mealsByDate.get(m.date) || 0) + total);
    });

    const costsByDate = new Map<string, number>();
    mealCosts.forEach(c => {
      costsByDate.set(c.date, (costsByDate.get(c.date) || 0) + c.amount);
    });

    const allDates = [...new Set([...mealsByDate.keys(), ...costsByDate.keys()])].sort();

    let runningCost = 0;
    let runningMeals = 0;

    return allDates.map(date => {
      runningCost += costsByDate.get(date) || 0;
      runningMeals += mealsByDate.get(date) || 0;
      const rate = runningMeals > 0 ? runningCost / runningMeals : 0;
      const d = new Date(date);
      return {
        date,
        label: d.toLocaleDateString('en-BD', { day: 'numeric', month: 'short' }),
        currentRate: parseFloat(rate.toFixed(2)),
        runningCost,
        runningMeals,
      };
    });
  }, [meals, mealCosts]);

  const analysis = useMemo(() => {
    const target = parseFloat(targetRate);
    if (!target || target <= 0) return null;

    const totalMealCost = mealCosts.reduce((s, c) => s + c.amount, 0);
    const totalMeals = meals.reduce((s, m) => s + m.breakfast + m.lunch + m.dinner, 0);
    const currentRate = totalMeals > 0 ? totalMealCost / totalMeals : 0;

    const daysInMonth = new Date(monthYear.year, monthYear.month + 1, 0).getDate();
    const mealDates = new Set(meals.map(m => m.date));
    const elapsedDays = mealDates.size || 1;
    const now = new Date();
    const remainingDays = Math.max(daysInMonth - now.getDate(), 1);

    const avgMealsPerDay = totalMeals / elapsedDays;
    const predictedRemainingMeals = avgMealsPerDay * remainingDays;
    const predictedTotalMeals = totalMeals + predictedRemainingMeals;

    const requiredTotalCost = target * predictedTotalMeals;
    const remainingBudget = requiredTotalCost - totalMealCost;
    const dailySpendingLimit = Math.max(remainingBudget / remainingDays, 0);

    const predictedEndRate = predictedTotalMeals > 0
      ? (totalMealCost + (dailySpendingLimit * remainingDays)) / predictedTotalMeals
      : 0;

    const avgMealPerMemberPerDay = memberCount > 0
      ? avgMealsPerDay / memberCount
      : 0;

    const requiredDailyMeals = predictedRemainingMeals / remainingDays;

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
      requiredDailyMeals: parseFloat(requiredDailyMeals.toFixed(2)),
      isOverspent,
      budgetAvailable: parseFloat(budgetAvailable.toFixed(2)),
      remainingBudget: parseFloat(remainingBudget.toFixed(2)),
      predictedTotalMeals,
      avgMealsPerDay,
      elapsedDays,
      daysInMonth,
    };
  }, [targetRate, meals, mealCosts, totalDeposit, memberCount, monthYear]);

  // Build chart data combining current rate + target projection
  const chartData = useMemo((): RateDataPoint[] => {
    if (!dailyData.length) return [];
    const target = parseFloat(targetRate);

    // Current rate line (historical data)
    const points: RateDataPoint[] = dailyData.map(d => ({
      date: d.date,
      label: d.label,
      currentRate: d.currentRate,
      targetRate: null,
    }));

    if (!target || target <= 0 || !analysis) return points;

    // Add target projection for remaining days
    const lastData = dailyData[dailyData.length - 1];
    let projCost = lastData.runningCost;
    let projMeals = lastData.runningMeals;
    const dailySpend = analysis.dailySpendingLimit;
    const dailyMeals = analysis.avgMealsPerDay;

    // Set target rate on the last actual data point
    const lastCurrentRate = lastData.runningMeals > 0 ? lastData.runningCost / lastData.runningMeals : 0;
    points[points.length - 1].targetRate = parseFloat(lastCurrentRate.toFixed(2));

    const now = new Date();
    for (let i = 1; i <= analysis.remainingDays; i++) {
      const futureDate = new Date(now);
      futureDate.setDate(now.getDate() + i);
      const dateStr = futureDate.toISOString().split('T')[0];

      projCost += dailySpend;
      projMeals += dailyMeals;
      const projRate = projMeals > 0 ? projCost / projMeals : 0;

      points.push({
        date: dateStr,
        label: futureDate.toLocaleDateString('en-BD', { day: 'numeric', month: 'short' }),
        currentRate: null,
        targetRate: parseFloat(projRate.toFixed(2)),
      });
    }

    return points;
  }, [dailyData, targetRate, analysis]);

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
        <div className="space-y-4">
          {analysis.isOverspent && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/30">
              <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
              <p className="text-xs text-destructive">
                Target meal rate already exceeded. Current spending surpasses ৳{targetRate}/meal. Reduce spending or increase meals significantly.
              </p>
            </div>
          )}

          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-2">
            <ResultCard
              icon={<DollarSign className="h-3.5 w-3.5" />}
              label="Daily Spending Limit"
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
              label="Meal/Member/Day"
              value={`${analysis.avgMealPerMemberPerDay}`}
            />
            <ResultCard
              icon={<Utensils className="h-3.5 w-3.5" />}
              label="Req. Daily Meals"
              value={`${analysis.requiredDailyMeals}`}
            />
            <ResultCard
              icon={<TrendingDown className="h-3.5 w-3.5" />}
              label="Remaining Budget"
              value={`৳${analysis.remainingBudget}`}
              color={analysis.remainingBudget < 0 ? 'text-[hsl(0,84%,60%)]' : 'text-[hsl(142,71%,45%)]'}
            />
          </div>

          {/* GRAPH: Current Rate vs Target Rate */}
          {chartData.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Rate Trend & Projection
              </p>
              <div className="h-52 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis
                      dataKey="label"
                      tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }}
                      tickLine={false}
                      axisLine={{ stroke: 'hsl(var(--border))' }}
                      interval="preserveStartEnd"
                    />
                    <YAxis
                      tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }}
                      tickLine={false}
                      axisLine={{ stroke: 'hsl(var(--border))' }}
                      width={40}
                    />
                    <Tooltip content={<RateControlTooltip target={parseFloat(targetRate)} />} />
                    <Legend
                      wrapperStyle={{ fontSize: '10px' }}
                      iconType="line"
                    />
                    <ReferenceLine
                      y={parseFloat(targetRate)}
                      stroke="#f97316"
                      strokeDasharray="5 5"
                      strokeWidth={1}
                      label={{ value: `Target ৳${targetRate}`, position: 'right', fontSize: 9, fill: '#f97316' }}
                    />
                    <Line
                      type="monotone"
                      dataKey="currentRate"
                      name="Current Rate"
                      stroke="#3b82f6"
                      strokeWidth={2.5}
                      dot={{ r: 2.5, fill: '#3b82f6' }}
                      activeDot={{ r: 5 }}
                      connectNulls={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="targetRate"
                      name="Target Projection"
                      stroke="#22c55e"
                      strokeWidth={2}
                      strokeDasharray="6 3"
                      dot={{ r: 2, fill: '#22c55e' }}
                      activeDot={{ r: 4 }}
                      connectNulls={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div className="flex items-center justify-center gap-4 text-[10px] text-muted-foreground">
                <span className="flex items-center gap-1"><span className="w-3 h-[2px] bg-[#3b82f6] inline-block" /> Actual</span>
                <span className="flex items-center gap-1"><span className="w-3 h-[2px] bg-[#22c55e] inline-block border-dashed" /> Projection</span>
                <span className="flex items-center gap-1"><span className="w-3 h-[2px] bg-[#f97316] inline-block border-dashed" /> Target</span>
              </div>
            </div>
          )}

          {/* Summary */}
          <div className="p-3 rounded-lg bg-muted/50 border border-border text-xs text-muted-foreground space-y-1.5">
            <p>
              To maintain a meal rate of <span className="font-semibold text-foreground">৳{targetRate}</span>,
              spend approximately <span className="font-semibold text-foreground">৳{analysis.dailySpendingLimit}</span>/day
              for the remaining <span className="font-semibold text-foreground">{analysis.remainingDays}</span> days.
            </p>
            <p>
              Each member should consume approximately <span className="font-semibold text-foreground">{analysis.avgMealPerMemberPerDay}</span> meals/day.
            </p>
            <p className="text-[10px] pt-1 border-t border-border/50">
              Current: ৳{analysis.currentRate}/meal • Spent: ৳{analysis.totalMealCost} • Budget: ৳{analysis.budgetAvailable}
            </p>
          </div>
        </div>
      )}

      {!analysis && (
        <p className="text-center text-muted-foreground py-6 text-sm">
          Enter a target meal rate to see analysis and projections.
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

function RateControlTooltip({ active, payload, label, target }: any) {
  if (!active || !payload?.length) return null;
  const point = payload[0]?.payload as RateDataPoint;
  if (!point) return null;

  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2 text-xs shadow-lg">
      <p className="font-medium text-foreground mb-1">{label}</p>
      {point.currentRate !== null && (
        <p style={{ color: '#3b82f6' }}>Current Rate: ৳{point.currentRate}</p>
      )}
      {point.targetRate !== null && (
        <p style={{ color: '#22c55e' }}>Target Projection: ৳{point.targetRate}</p>
      )}
      {target > 0 && (
        <p className="text-muted-foreground">Target: ৳{target}</p>
      )}
    </div>
  );
}
