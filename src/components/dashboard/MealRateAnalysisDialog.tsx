import { useEffect, useState, useMemo, useCallback } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { TrendingUp, Loader2 } from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, ReferenceLine
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
  dailyCost: number;
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
      const dayCost = costsByDate.get(date) || 0;
      runningCost += dayCost;
      runningMeals += mealsByDate.get(date) || 0;
      const rate = runningMeals > 0 ? runningCost / runningMeals : 0;

      const d = new Date(date);
      return {
        date,
        label: d.toLocaleDateString('en-BD', { day: 'numeric', month: 'short' }),
        mealRate: parseFloat(rate.toFixed(2)),
        dailyCost: parseFloat(dayCost.toFixed(2)),
        totalCost: parseFloat(runningCost.toFixed(2)),
        totalMeals: runningMeals,
      };
    });
  }, [meals, mealCosts]);

  const avgRate = useMemo(() => {
    if (!dailyRates.length) return 0;
    const sum = dailyRates.reduce((s, d) => s + d.mealRate, 0);
    return parseFloat((sum / dailyRates.length).toFixed(2));
  }, [dailyRates]);

  const getRateDotColor = useCallback((value: number) => {
    if (value <= avgRate * 0.9) return '#22c55e'; // green - below avg
    if (value <= avgRate * 1.1) return '#f97316'; // orange - around avg
    return '#ef4444'; // red - above avg
  }, [avgRate]);

  const CustomRateDot = useCallback((props: any) => {
    const { cx, cy, payload } = props;
    if (!cx || !cy) return null;
    return (
      <circle
        cx={cx} cy={cy} r={4}
        fill={getRateDotColor(payload.mealRate)}
        stroke={getRateDotColor(payload.mealRate)}
        strokeWidth={1.5}
      />
    );
  }, [getRateDotColor]);

  // Build segmented line data for meal rate coloring
  const segments = useMemo(() => {
    if (dailyRates.length < 2) return [];
    const segs: { x1: number; x2: number; color: string }[] = [];
    for (let i = 0; i < dailyRates.length - 1; i++) {
      const avgVal = (dailyRates[i].mealRate + dailyRates[i + 1].mealRate) / 2;
      segs.push({ x1: i, x2: i + 1, color: getRateDotColor(avgVal) });
    }
    return segs;
  }, [dailyRates, getRateDotColor]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-7 px-2 gap-1 text-xs border-accent/30 bg-accent/10 text-accent hover:bg-accent/20 hover:text-accent"
          title="Meal Rate Analysis"
        >
          <TrendingUp className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Analysis</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-[95vw] sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <TrendingUp className="h-5 w-5 text-accent" />
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
            <div className="grid grid-cols-3 gap-2 sm:gap-3">
              <div className="p-2.5 sm:p-3 rounded-lg bg-muted/50 border border-border text-center">
                <p className="text-[10px] sm:text-[11px] text-muted-foreground uppercase tracking-wider">Current Rate</p>
                <p className="text-base sm:text-lg font-bold text-foreground">
                  ৳{dailyRates[dailyRates.length - 1]?.mealRate ?? 0}
                </p>
              </div>
              <div className="p-2.5 sm:p-3 rounded-lg bg-muted/50 border border-border text-center">
                <p className="text-[10px] sm:text-[11px] text-muted-foreground uppercase tracking-wider">Avg Rate</p>
                <p className="text-base sm:text-lg font-bold text-foreground">
                  ৳{avgRate}
                </p>
              </div>
              <div className="p-2.5 sm:p-3 rounded-lg bg-muted/50 border border-border text-center">
                <p className="text-[10px] sm:text-[11px] text-muted-foreground uppercase tracking-wider">Total Cost</p>
                <p className="text-base sm:text-lg font-bold text-foreground">
                  ৳{dailyRates[dailyRates.length - 1]?.totalCost ?? 0}
                </p>
              </div>
            </div>

            {/* Legend */}
            <div className="flex items-center justify-center gap-3 sm:gap-4 text-[10px] sm:text-xs text-muted-foreground">
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-[#22c55e]" /> Below Avg</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-[#f97316]" /> Average</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-[#ef4444]" /> Above Avg</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-[#3b82f6]" /> Daily Cost</span>
            </div>

            {/* Line Chart */}
            <div className="h-56 sm:h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={dailyRates} margin={{ top: 10, right: 10, left: -10, bottom: 5 }}>
                  <defs>
                    {/* Gradient segments for the meal rate line */}
                    {segments.map((seg, i) => (
                      <linearGradient key={i} id={`seg-${i}`} x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor={seg.color} />
                        <stop offset="100%" stopColor={seg.color} />
                      </linearGradient>
                    ))}
                  </defs>
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
                  <Tooltip content={<RateTooltip avgRate={avgRate} />} />
                  <ReferenceLine
                    y={avgRate}
                    stroke="#f97316"
                    strokeDasharray="5 5"
                    strokeWidth={1.5}
                    label={{ value: `Avg ৳${avgRate}`, position: 'right', fontSize: 10, fill: '#f97316' }}
                  />
                  {/* Daily Cost line */}
                  <Line
                    type="monotone"
                    dataKey="dailyCost"
                    name="Daily Cost (৳)"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    dot={{ r: 2.5, fill: '#3b82f6' }}
                    activeDot={{ r: 4 }}
                  />
                  {/* Meal Rate line with colored dots */}
                  <Line
                    type="monotone"
                    dataKey="mealRate"
                    name="Meal Rate (৳)"
                    stroke="hsl(var(--muted-foreground))"
                    strokeWidth={2.5}
                    dot={<CustomRateDot />}
                    activeDot={{ r: 6 }}
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

function RateTooltip({ active, payload, label, avgRate }: any) {
  if (!active || !payload?.length) return null;
  const item = payload[0]?.payload as DailyRate | undefined;
  if (!item) return null;

  const diff = item.mealRate - avgRate;
  const diffLabel = diff > 0 ? `+৳${diff.toFixed(2)}` : `৳${diff.toFixed(2)}`;
  const diffColor = diff > avgRate * 0.1 ? '#ef4444' : diff < -avgRate * 0.1 ? '#22c55e' : '#f97316';

  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2 text-xs shadow-lg">
      <p className="font-medium text-foreground mb-1">{label}</p>
      <p className="text-muted-foreground">Rate: ৳{item.mealRate}/meal <span style={{ color: diffColor }}>({diffLabel})</span></p>
      <p style={{ color: '#3b82f6' }}>Daily Cost: ৳{item.dailyCost}</p>
      <p className="text-muted-foreground">Total: ৳{item.totalCost} • {item.totalMeals} meals</p>
    </div>
  );
}
