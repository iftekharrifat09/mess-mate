import { useEffect, useState, useMemo } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { TrendingUp, Loader2 } from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend
} from 'recharts';
import { Meal, MealCost } from '@/types';
import * as dataService from '@/lib/dataService';

interface MealRateAnalysisDialogProps {
  monthId: string;
}

interface DailyRate {
  date: string;
  label: string;
  mealRate: number;
  totalCost: number;
  totalMeals: number;
}

export default function MealRateAnalysisDialog({ monthId }: MealRateAnalysisDialogProps) {
  const [open, setOpen] = useState(false);
  const [meals, setMeals] = useState<Meal[]>([]);
  const [mealCosts, setMealCosts] = useState<MealCost[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !monthId) return;
    setLoading(true);
    Promise.all([
      dataService.getMealsByMonthId(monthId),
      dataService.getMealCostsByMonthId(monthId),
    ]).then(([m, c]) => {
      setMeals(m);
      setMealCosts(c);
    }).finally(() => setLoading(false));
  }, [open, monthId]);

  const dailyRates = useMemo((): DailyRate[] => {
    if (!meals.length || !mealCosts.length) return [];

    // Group meals by date
    const mealsByDate = new Map<string, number>();
    meals.forEach(m => {
      const total = m.breakfast + m.lunch + m.dinner;
      mealsByDate.set(m.date, (mealsByDate.get(m.date) || 0) + total);
    });

    // Group costs by date
    const costsByDate = new Map<string, number>();
    mealCosts.forEach(c => {
      costsByDate.set(c.date, (costsByDate.get(c.date) || 0) + c.amount);
    });

    // Get all unique dates sorted
    const allDates = [...new Set([...mealsByDate.keys(), ...costsByDate.keys()])].sort();

    // Calculate running totals and rate per day
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
        mealRate: parseFloat(rate.toFixed(2)),
        totalCost: parseFloat(runningCost.toFixed(2)),
        totalMeals: runningMeals,
      };
    });
  }, [meals, mealCosts]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-7 w-7" title="Meal Rate Analysis">
          <TrendingUp className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-[95vw] sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <TrendingUp className="h-5 w-5 text-primary" />
            Meal Rate Analysis
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-5 w-5 animate-spin text-primary mr-2" />
            <span className="text-sm text-muted-foreground">Loading data...</span>
          </div>
        ) : dailyRates.length === 0 ? (
          <p className="text-center text-muted-foreground py-8 text-sm">
            No meal data available for this month yet.
          </p>
        ) : (
          <div className="space-y-4">
            {/* Summary */}
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 rounded-lg bg-muted/50 border border-border text-center">
                <p className="text-[11px] text-muted-foreground uppercase tracking-wider">Current Rate</p>
                <p className="text-lg font-bold text-primary">
                  ৳{dailyRates[dailyRates.length - 1]?.mealRate ?? 0}
                </p>
              </div>
              <div className="p-3 rounded-lg bg-muted/50 border border-border text-center">
                <p className="text-[11px] text-muted-foreground uppercase tracking-wider">Total Cost</p>
                <p className="text-lg font-bold text-foreground">
                  ৳{dailyRates[dailyRates.length - 1]?.totalCost ?? 0}
                </p>
              </div>
              <div className="p-3 rounded-lg bg-muted/50 border border-border text-center">
                <p className="text-[11px] text-muted-foreground uppercase tracking-wider">Total Meals</p>
                <p className="text-lg font-bold text-foreground">
                  {dailyRates[dailyRates.length - 1]?.totalMeals ?? 0}
                </p>
              </div>
            </div>

            {/* Line Chart */}
            <div className="h-56 sm:h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={dailyRates} margin={{ top: 10, right: 10, left: -10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                    tickLine={false}
                    axisLine={{ stroke: 'hsl(var(--border))' }}
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                    tickLine={false}
                    axisLine={{ stroke: 'hsl(var(--border))' }}
                    width={40}
                  />
                  <Tooltip content={<RateTooltip />} />
                  <Legend
                    wrapperStyle={{ fontSize: '12px', paddingTop: '8px' }}
                  />
                  <Line
                    type="monotone"
                    dataKey="mealRate"
                    name="Meal Rate (৳)"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2.5}
                    dot={{ r: 3, fill: 'hsl(var(--primary))' }}
                    activeDot={{ r: 5 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function RateTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const item = payload[0]?.payload as DailyRate | undefined;
  if (!item) return null;

  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2 text-xs shadow-lg">
      <p className="font-medium text-foreground mb-1">{label}</p>
      <p className="text-muted-foreground">Rate: ৳{item.mealRate}/meal</p>
      <p className="text-muted-foreground">Total Cost: ৳{item.totalCost}</p>
      <p className="text-muted-foreground">Total Meals: {item.totalMeals}</p>
    </div>
  );
}
