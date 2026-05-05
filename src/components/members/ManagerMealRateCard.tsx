import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChartContainer, ChartTooltip } from '@/components/ui/chart';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Cell, ReferenceLine } from 'recharts';
import { TrendingUp, Crown, Loader2, Calendar } from 'lucide-react';
import * as dataService from '@/lib/dataService';
import { fetchMonthData, calculateMonthSummaryFromData } from '@/lib/calculations';
import { Month, MessActivityLog, User } from '@/types';
import { formatCurrency } from '@/lib/calculations';

interface ManagerMealRateCardProps {
  messId: string;
  members: User[];
}

interface MonthManagerData {
  monthLabel: string;
  mealRate: number;
  managerName: string;
  managerId: string;
  year: number;
  month: number;
  activeDays: number;
  inactiveDays: number;
  totalDays: number;
  managerSegments?: { name: string; startDate: string; endDate: string; days: number }[];
}

export default function ManagerMealRateCard({ messId, members }: ManagerMealRateCardProps) {
  const [allData, setAllData] = useState<MonthManagerData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState<string>(String(new Date().getFullYear()));

  useEffect(() => {
    loadData();
  }, [messId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [allMonths, activityLogs] = await Promise.all([
        dataService.getMonthsByMessId(messId),
        dataService.getActivityLogsByMessId(messId),
      ]);

      const sortedMonths = allMonths.sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );

      const managerChanges = activityLogs
        .filter(log => log.type === 'manager_change')
        .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

      const mess = await dataService.getMessById(messId);
      const currentManagerId = mess?.managerId || '';

      const chartData: MonthManagerData[] = [];

      for (const month of sortedMonths) {
        try {
          const monthData = await fetchMonthData(month.id, messId);
          const summary = calculateMonthSummaryFromData(month.id, monthData);

          let { managerId, segments } = findManagerForMonth(month, managerChanges, currentManagerId);
          // For the currently-active month, always trust the live mess.managerId
          if (month.isActive && currentManagerId) {
            managerId = currentManagerId;
            const liveMgr = members.find(m => m.id === currentManagerId);
            if (liveMgr && segments.length > 0) {
              segments[segments.length - 1] = {
                ...segments[segments.length - 1],
                name: liveMgr.fullName,
              };
            }
          }
          const manager = members.find(m => m.id === managerId);

          const monthStart = new Date(month.createdAt);
          const monthEnd = month.isActive ? new Date() : (() => {
            const idx = sortedMonths.indexOf(month);
            if (idx < sortedMonths.length - 1) return new Date(sortedMonths[idx + 1].createdAt);
            return new Date(monthStart.getTime() + 30 * 24 * 60 * 60 * 1000);
          })();
          const totalDays = Math.max(1, Math.ceil((monthEnd.getTime() - monthStart.getTime()) / (1000 * 60 * 60 * 24)));

          const activeDates = new Set<string>();
          monthData.meals.forEach(m => activeDates.add(m.date));
          monthData.deposits.forEach(d => activeDates.add(d.date));
          monthData.mealCosts.forEach(c => activeDates.add(c.date));
          monthData.otherCosts.forEach(c => activeDates.add(c.date));

          const activeDays = activeDates.size;
          const inactiveDays = Math.max(0, totalDays - activeDays);

          chartData.push({
            monthLabel: month.name || `${month.year}-${String(month.month).padStart(2, '0')}`,
            mealRate: Math.round(summary.mealRate * 100) / 100,
            managerName: manager?.fullName || 'Unknown',
            managerId,
            year: month.year,
            month: month.month,
            activeDays,
            inactiveDays,
            totalDays,
            managerSegments: segments.length > 0 ? segments : undefined,
          });
        } catch {
          // Skip months with errors
        }
      }

      setAllData(chartData);
    } catch (error) {
      console.error('Error loading manager meal rate data:', error);
    } finally {
      setLoading(false);
    }
  };

  const findManagerForMonth = (
    month: Month,
    changes: MessActivityLog[],
    currentManagerId: string
  ): { managerId: string; segments: { name: string; startDate: string; endDate: string; days: number }[] } => {
    const monthStart = new Date(month.createdAt);
    const monthEnd = (month as any).endDate ? new Date((month as any).endDate) : new Date();

    const monthChanges = changes.filter(c => {
      const d = new Date(c.createdAt);
      return d >= monthStart && d <= monthEnd;
    });

    if (monthChanges.length === 0) {
      let managerId = currentManagerId;
      for (let i = changes.length - 1; i >= 0; i--) {
        const changeDate = new Date(changes[i].createdAt);
        if (changeDate <= monthStart) {
          const desc = changes[i].description;
          const match = desc.match(/to (.+)$/);
          if (match) {
            const found = members.find(m => m.fullName === match[1].trim());
            if (found) managerId = found.id;
          }
          break;
        }
      }
      const mgr = members.find(m => m.id === managerId);
      const days = Math.ceil((monthEnd.getTime() - monthStart.getTime()) / (1000 * 60 * 60 * 24));
      return {
        managerId,
        segments: [{ name: mgr?.fullName || 'Unknown', startDate: monthStart.toLocaleDateString(), endDate: monthEnd.toLocaleDateString(), days }],
      };
    }

    const segments: { name: string; startDate: string; endDate: string; days: number }[] = [];
    let lastDate = monthStart;
    let lastManagerName = '';

    for (let i = changes.length - 1; i >= 0; i--) {
      const changeDate = new Date(changes[i].createdAt);
      if (changeDate <= monthStart) {
        const desc = changes[i].description;
        const toMatch = desc.match(/to (.+)$/);
        if (toMatch) lastManagerName = toMatch[1].trim();
        break;
      }
    }
    if (!lastManagerName) {
      const fromMatch = monthChanges[0].description.match(/from (.+?) to/);
      lastManagerName = fromMatch ? fromMatch[1].trim() : 'Unknown';
    }

    for (const change of monthChanges) {
      const changeDate = new Date(change.createdAt);
      const days = Math.max(1, Math.ceil((changeDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24)));
      segments.push({
        name: lastManagerName,
        startDate: lastDate.toLocaleDateString(),
        endDate: changeDate.toLocaleDateString(),
        days,
      });
      const toMatch = change.description.match(/to (.+)$/);
      lastManagerName = toMatch ? toMatch[1].trim() : 'Unknown';
      lastDate = changeDate;
    }

    const finalDays = Math.max(1, Math.ceil((monthEnd.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24)));
    segments.push({
      name: lastManagerName,
      startDate: lastDate.toLocaleDateString(),
      endDate: monthEnd.toLocaleDateString(),
      days: finalDays,
    });

    const primaryManager = segments.reduce((a, b) => a.days >= b.days ? a : b);
    const found = members.find(m => m.fullName === primaryManager.name);

    return {
      managerId: found?.id || currentManagerId,
      segments,
    };
  };

  const availableYears = useMemo(() => {
    const years = [...new Set(allData.map(d => d.year))].sort((a, b) => b - a);
    return years.length > 0 ? years : [new Date().getFullYear()];
  }, [allData]);

  const data = useMemo(() => {
    if (selectedYear === 'all') return allData;
    return allData.filter(d => d.year === Number(selectedYear));
  }, [allData, selectedYear]);

  const avgMealRate = useMemo(() => {
    if (data.length === 0) return 0;
    return data.reduce((sum, d) => sum + d.mealRate, 0) / data.length;
  }, [data]);

  const getBarColor = (rate: number) => {
    if (avgMealRate === 0) return 'hsl(var(--primary))';
    const diff = ((rate - avgMealRate) / avgMealRate) * 100;
    if (diff < -5) return 'hsl(142 76% 36%)';
    if (diff > 5) return 'hsl(0 84% 60%)';
    return 'hsl(38 92% 50%)';
  };

  const managerFrequency = useMemo(() => {
    const freq: Record<string, { name: string; count: number }> = {};
    data.forEach(d => {
      if (!freq[d.managerId]) {
        freq[d.managerId] = { name: d.managerName, count: 0 };
      }
      freq[d.managerId].count++;
    });
    return Object.values(freq).sort((a, b) => b.count - a.count);
  }, [data]);

  const chartConfig = useMemo(() => ({
    mealRate: { label: 'Meal Rate', color: 'hsl(var(--primary))' },
  }), []);

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-10">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  if (allData.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <TrendingUp className="h-4 w-4 text-primary" />
            Manager & Meal Rate History
          </CardTitle>
          <div className="flex items-center gap-2">
            <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
            <Select value={selectedYear} onValueChange={setSelectedYear}>
              <SelectTrigger className="h-8 w-[100px] text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Years</SelectItem>
                {availableYears.map(y => (
                  <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground mt-1">
          <span className="flex items-center gap-1"><span className="inline-block w-2.5 h-2.5 rounded-sm" style={{ background: 'hsl(142 76% 36%)' }} /> Below Avg</span>
          <span className="flex items-center gap-1"><span className="inline-block w-2.5 h-2.5 rounded-sm" style={{ background: 'hsl(38 92% 50%)' }} /> Near Avg</span>
          <span className="flex items-center gap-1"><span className="inline-block w-2.5 h-2.5 rounded-sm" style={{ background: 'hsl(0 84% 60%)' }} /> Above Avg</span>
          <span className="ml-auto font-medium">Avg: {formatCurrency(avgMealRate)}</span>
        </div>
      </CardHeader>
      <CardContent className="space-y-1.5">
        {data.length === 0 ? (
          <p className="text-center text-muted-foreground py-6 text-sm">No data for {selectedYear}</p>
        ) : (
          <>
            <div className="w-full overflow-x-auto">
              <div style={{ minWidth: Math.max(320, data.length * 70) }}>
              <ChartContainer config={chartConfig} className="h-[300px] sm:h-[340px] w-full">
                <BarChart data={data} margin={{ top: 16, right: 8, bottom: 90, left: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" />
                  <XAxis
                    dataKey="monthLabel"
                    tick={({ x, y, payload }: any) => {
                      const name = data.find(d => d.monthLabel === payload.value)?.managerName || '';
                      const shortName = name.length > 14 ? name.slice(0, 13) + '…' : name;
                      return (
                        <g transform={`translate(${x},${y})`}>
                          <text x={0} y={0} dy={10} textAnchor="end" fill="hsl(var(--muted-foreground))" fontSize={9} transform="rotate(-35)">
                            {payload.value}
                          </text>
                          <text x={0} y={0} dy={24} textAnchor="end" fill="hsl(var(--muted-foreground))" fontSize={8} transform="rotate(-35)" opacity={0.7}>
                            {shortName}
                          </text>
                        </g>
                      );
                    }}
                    height={90}
                    interval={0}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                    tickFormatter={(v) => `৳${v}`}
                    width={45}
                  />
                  <ReferenceLine y={avgMealRate} stroke="hsl(var(--muted-foreground))" strokeDasharray="4 4" strokeWidth={1.5} />
                  <ChartTooltip
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      const d = payload[0].payload as MonthManagerData;
                      return (
                        <div className="rounded-lg border border-border/50 bg-background px-3 py-2 text-sm shadow-xl max-w-[280px]">
                          <p className="font-semibold text-foreground">{d.monthLabel}</p>
                          <p className="text-muted-foreground">
                            Manager: <span className="font-medium text-foreground">{d.managerName}</span>
                          </p>
                          <p className="text-muted-foreground">
                            Meal Rate: <span className="font-semibold text-primary">{formatCurrency(d.mealRate)}</span>
                          </p>
                          <div className="flex gap-3 mt-1 text-xs">
                            <span className="text-success">Active: {d.activeDays}d</span>
                            <span className="text-destructive">Inactive: {d.inactiveDays}d</span>
                            <span className="text-muted-foreground">Total: {d.totalDays}d</span>
                          </div>
                          {d.managerSegments && d.managerSegments.length > 1 && (
                            <div className="mt-1.5 pt-1.5 border-t border-border/50 space-y-1">
                              <p className="text-xs font-medium text-foreground">Manager Timeline:</p>
                              {d.managerSegments.map((seg, i) => (
                                <p key={i} className="text-xs text-muted-foreground">
                                  {seg.name}: {seg.days}d ({seg.startDate} → {seg.endDate})
                                </p>
                              ))}
                            </div>
                          )}
                          {d.managerSegments && d.managerSegments.length === 1 && (
                            <div className="mt-1 text-xs text-muted-foreground">
                              Period: {d.managerSegments[0].startDate} → {d.managerSegments[0].endDate}
                            </div>
                          )}
                        </div>
                      );
                    }}
                  />
                  <Bar dataKey="mealRate" radius={[4, 4, 0, 0]} maxBarSize={40}>
                    {data.map((entry, index) => (
                      <Cell key={index} fill={getBarColor(entry.mealRate)} />
                    ))}
                  </Bar>
                </BarChart>
              </ChartContainer>
              </div>
            </div>

            {/* Active/Inactive Summary Row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {data.slice(-4).map((d) => (
                <div key={d.monthLabel} className="p-2 rounded-lg bg-muted/50 border border-border/50 text-center">
                  <p className="text-[10px] text-muted-foreground truncate">{d.monthLabel}</p>
                  <div className="flex justify-center gap-2 text-xs mt-0.5">
                    <span className="text-success font-medium">{d.activeDays}d</span>
                    <span className="text-muted-foreground">/</span>
                    <span className="text-destructive font-medium">{d.inactiveDays}d</span>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Manager Frequency Summary */}
        {managerFrequency.length > 0 && (
          <div className="border-t border-border pt-3">
            <h3 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
              <Crown className="h-3.5 w-3.5 text-warning" />
              Manager Frequency {selectedYear !== 'all' && `(${selectedYear})`}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
              {managerFrequency.map((item) => (
                <div
                  key={item.name}
                  className="flex items-center justify-between p-2.5 rounded-lg bg-muted/50 border border-border/50"
                >
                  <span className="text-sm font-medium text-foreground">{item.name}</span>
                  <Badge variant="secondary" className="text-xs">
                    {item.count} {item.count === 1 ? 'time' : 'times'}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}