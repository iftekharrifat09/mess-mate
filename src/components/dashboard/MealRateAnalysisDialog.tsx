import { useEffect, useState, useMemo, useCallback } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { TrendingUp, Loader2, BarChart3 } from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine,
  BarChart, Bar, Cell
} from 'recharts';
import { Meal, MealCost, Month } from '@/types';
import * as dataService from '@/lib/dataService';
import { calculateMonthSummary } from '@/lib/calculations';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface MealRateAnalysisDialogProps {
  monthId: string;
  messId: string;
}

interface DailyRate {
  date: string;
  label: string;
  mealRate: number;
  dailyCost: number;
  totalCost: number;
  totalMeals: number;
}

interface MonthlyComparison {
  name: string;
  mealRate: number;
  totalCost: number;
  totalMeals: number;
  monthId: string;
}

export default function MealRateAnalysisDialog({ monthId, messId }: MealRateAnalysisDialogProps) {
  const [open, setOpen] = useState(false);
  const [meals, setMeals] = useState<Meal[]>([]);
  const [mealCosts, setMealCosts] = useState<MealCost[]>([]);
  const [loading, setLoading] = useState(false);
  const [monthlyData, setMonthlyData] = useState<MonthlyComparison[]>([]);
  const [monthlyLoading, setMonthlyLoading] = useState(false);

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

  // Load monthly comparison data
  useEffect(() => {
    if (!open || !messId) return;
    setMonthlyLoading(true);
    dataService.getMonthsByMessId(messId).then(async (months: Month[]) => {
      // Sort by year/month descending, take last 6
      const sorted = [...months].sort((a, b) => {
        if (a.year !== b.year) return b.year - a.year;
        return b.month - a.month;
      }).slice(0, 6).reverse();

      const comparisons: MonthlyComparison[] = [];
      for (const month of sorted) {
        try {
          const summary = await calculateMonthSummary(month.id, messId);
          comparisons.push({
            name: month.name,
            mealRate: parseFloat(summary.mealRate.toFixed(2)),
            totalCost: parseFloat(summary.totalMealCost.toFixed(0)),
            totalMeals: summary.totalMeals,
            monthId: month.id,
          });
        } catch { /* skip failed months */ }
      }
      setMonthlyData(comparisons);
    }).finally(() => setMonthlyLoading(false));
  }, [open, messId]);

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
    if (value <= avgRate * 0.9) return '#22c55e';
    if (value <= avgRate * 1.1) return '#f97316';
    return '#ef4444';
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

  // Monthly comparison color logic
  const monthlyAvgRate = useMemo(() => {
    if (!monthlyData.length) return 0;
    return parseFloat((monthlyData.reduce((s, d) => s + d.mealRate, 0) / monthlyData.length).toFixed(2));
  }, [monthlyData]);

  const getMonthBarColor = useCallback((rate: number) => {
    if (rate <= monthlyAvgRate * 0.9) return '#22c55e';
    if (rate <= monthlyAvgRate * 1.1) return '#f97316';
    return '#ef4444';
  }, [monthlyAvgRate]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          className="gap-1.5 border-[goldenrod]/40 bg-[goldenrod]/10 text-[goldenrod] hover:bg-[goldenrod]/20 hover:text-[goldenrod]"
          title="Meal Rate Analysis"
        >
          <TrendingUp className="h-4 w-4" />
          Analysis
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-[95vw] sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <TrendingUp className="h-5 w-5 text-accent" />
            Meal Rate Analysis
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="daily" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="daily" className="text-xs sm:text-sm gap-1">
              <TrendingUp className="h-3.5 w-3.5" />
              Daily Trend
            </TabsTrigger>
            <TabsTrigger value="monthly" className="text-xs sm:text-sm gap-1">
              <BarChart3 className="h-3.5 w-3.5" />
              Monthly Comparison
            </TabsTrigger>
          </TabsList>

          {/* Daily Trend Tab */}
          <TabsContent value="daily" className="mt-4">
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
                <div className="grid grid-cols-3 gap-2 sm:gap-3">
                  <div className="p-2.5 sm:p-3 rounded-lg bg-muted/50 border border-border text-center">
                    <p className="text-[10px] sm:text-[11px] text-muted-foreground uppercase tracking-wider">Current Rate</p>
                    <p className="text-base sm:text-lg font-bold text-foreground">
                      ৳{dailyRates[dailyRates.length - 1]?.mealRate ?? 0}
                    </p>
                  </div>
                  <div className="p-2.5 sm:p-3 rounded-lg bg-muted/50 border border-border text-center">
                    <p className="text-[10px] sm:text-[11px] text-muted-foreground uppercase tracking-wider">Avg Rate</p>
                    <p className="text-base sm:text-lg font-bold text-foreground">৳{avgRate}</p>
                  </div>
                  <div className="p-2.5 sm:p-3 rounded-lg bg-muted/50 border border-border text-center">
                    <p className="text-[10px] sm:text-[11px] text-muted-foreground uppercase tracking-wider">Total Cost</p>
                    <p className="text-base sm:text-lg font-bold text-foreground">
                      ৳{dailyRates[dailyRates.length - 1]?.totalCost ?? 0}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-center gap-3 sm:gap-4 text-[10px] sm:text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-[#22c55e]" /> Below Avg</span>
                  <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-[#f97316]" /> Average</span>
                  <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-[#ef4444]" /> Above Avg</span>
                  <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-[#3b82f6]" /> Daily Cost</span>
                </div>

                <div className="h-56 sm:h-72 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={dailyRates} margin={{ top: 10, right: 10, left: -10, bottom: 5 }}>
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
                      <Line
                        type="monotone"
                        dataKey="dailyCost"
                        name="Daily Cost (৳)"
                        stroke="#3b82f6"
                        strokeWidth={2}
                        dot={{ r: 2.5, fill: '#3b82f6' }}
                        activeDot={{ r: 4 }}
                      />
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
          </TabsContent>

          {/* Monthly Comparison Tab */}
          <TabsContent value="monthly" className="mt-4">
            {monthlyLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-5 w-5 animate-spin text-primary mr-2" />
                <span className="text-sm text-muted-foreground">Loading monthly data...</span>
              </div>
            ) : monthlyData.length === 0 ? (
              <p className="text-center text-muted-foreground py-8 text-sm">
                No monthly data available yet.
              </p>
            ) : (
              <div className="space-y-4">
                {/* Monthly summary stats */}
                <div className="grid grid-cols-3 gap-2 sm:gap-3">
                  <div className="p-2.5 sm:p-3 rounded-lg bg-muted/50 border border-border text-center">
                    <p className="text-[10px] sm:text-[11px] text-muted-foreground uppercase tracking-wider">Avg Rate</p>
                    <p className="text-base sm:text-lg font-bold text-foreground">৳{monthlyAvgRate}</p>
                  </div>
                  <div className="p-2.5 sm:p-3 rounded-lg bg-muted/50 border border-border text-center">
                    <p className="text-[10px] sm:text-[11px] text-muted-foreground uppercase tracking-wider">Lowest</p>
                    <p className="text-base sm:text-lg font-bold text-[#22c55e]">
                      ৳{Math.min(...monthlyData.map(d => d.mealRate)).toFixed(2)}
                    </p>
                  </div>
                  <div className="p-2.5 sm:p-3 rounded-lg bg-muted/50 border border-border text-center">
                    <p className="text-[10px] sm:text-[11px] text-muted-foreground uppercase tracking-wider">Highest</p>
                    <p className="text-base sm:text-lg font-bold text-[#ef4444]">
                      ৳{Math.max(...monthlyData.map(d => d.mealRate)).toFixed(2)}
                    </p>
                  </div>
                </div>

                {/* Legend */}
                <div className="flex items-center justify-center gap-3 sm:gap-4 text-[10px] sm:text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-[#22c55e]" /> Below Avg</span>
                  <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-[#f97316]" /> Average</span>
                  <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-[#ef4444]" /> Above Avg</span>
                </div>

                {/* Bar chart for monthly rates */}
                <div className="h-56 sm:h-72 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={monthlyData} margin={{ top: 10, right: 10, left: -10, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis
                        dataKey="name"
                        tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                        tickLine={false}
                        axisLine={{ stroke: 'hsl(var(--border))' }}
                      />
                      <YAxis
                        tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                        tickLine={false}
                        axisLine={{ stroke: 'hsl(var(--border))' }}
                        width={40}
                      />
                      <Tooltip content={<MonthlyTooltip avgRate={monthlyAvgRate} />} />
                      <ReferenceLine
                        y={monthlyAvgRate}
                        stroke="#f97316"
                        strokeDasharray="5 5"
                        strokeWidth={1.5}
                        label={{ value: `Avg ৳${monthlyAvgRate}`, position: 'right', fontSize: 10, fill: '#f97316' }}
                      />
                      <Bar dataKey="mealRate" radius={[4, 4, 0, 0]} maxBarSize={40}>
                        {monthlyData.map((entry, i) => (
                          <Cell key={i} fill={getMonthBarColor(entry.mealRate)} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* Monthly details list */}
                <div className="space-y-1.5">
                  {[...monthlyData].reverse().map((month, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between p-2.5 bg-muted/40 hover:bg-muted/70 rounded-lg text-sm transition-colors"
                    >
                      <span className="text-xs sm:text-sm font-medium">{month.name}</span>
                      <div className="flex items-center gap-2 sm:gap-3">
                        <span className="text-[10px] sm:text-xs text-muted-foreground">
                          {month.totalMeals} meals
                        </span>
                        <span className="text-[10px] sm:text-xs text-muted-foreground">
                          ৳{month.totalCost}
                        </span>
                        <span
                          className="font-bold text-xs sm:text-sm"
                          style={{ color: getMonthBarColor(month.mealRate) }}
                        >
                          ৳{month.mealRate}/meal
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
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

function MonthlyTooltip({ active, payload, label, avgRate }: any) {
  if (!active || !payload?.length) return null;
  const item = payload[0]?.payload as MonthlyComparison | undefined;
  if (!item) return null;

  const diff = item.mealRate - avgRate;
  const diffLabel = diff > 0 ? `+৳${diff.toFixed(2)}` : `৳${diff.toFixed(2)}`;
  const diffColor = diff > avgRate * 0.1 ? '#ef4444' : diff < -avgRate * 0.1 ? '#22c55e' : '#f97316';

  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2 text-xs shadow-lg">
      <p className="font-medium text-foreground mb-1">{label}</p>
      <p className="text-muted-foreground">Rate: ৳{item.mealRate}/meal <span style={{ color: diffColor }}>({diffLabel})</span></p>
      <p className="text-muted-foreground">Total Cost: ৳{item.totalCost}</p>
      <p className="text-muted-foreground">Total Meals: {item.totalMeals}</p>
    </div>
  );
}
