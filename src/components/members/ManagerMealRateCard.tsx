import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Cell, LabelList } from 'recharts';
import { TrendingUp, Crown, Loader2 } from 'lucide-react';
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
}

const COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--warning))',
  'hsl(142 76% 36%)',
  'hsl(280 67% 52%)',
  'hsl(199 89% 48%)',
  'hsl(350 80% 55%)',
];

export default function ManagerMealRateCard({ messId, members }: ManagerMealRateCardProps) {
  const [data, setData] = useState<MonthManagerData[]>([]);
  const [loading, setLoading] = useState(true);

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

      // Sort months chronologically
      const sortedMonths = allMonths.sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );

      // Build manager timeline from activity logs
      const managerChanges = activityLogs
        .filter(log => log.type === 'manager_change')
        .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

      // Get current manager from mess
      const mess = await dataService.getMessById(messId);
      const currentManagerId = mess?.managerId || '';

      // Build data for each month
      const chartData: MonthManagerData[] = [];

      for (const month of sortedMonths) {
        try {
          const monthData = await fetchMonthData(month.id, messId);
          const summary = calculateMonthSummaryFromData(month.id, monthData);

          // Find who was manager during this month
          const managerId = findManagerForMonth(month, managerChanges, currentManagerId);
          const manager = members.find(m => m.id === managerId);

          chartData.push({
            monthLabel: month.name || `${month.year}-${String(month.month).padStart(2, '0')}`,
            mealRate: Math.round(summary.mealRate * 100) / 100,
            managerName: manager?.fullName || 'Unknown',
            managerId,
          });
        } catch {
          // Skip months with errors
        }
      }

      setData(chartData);
    } catch (error) {
      console.error('Error loading manager meal rate data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Determine which manager was active during a given month
  const findManagerForMonth = (
    month: Month,
    changes: MessActivityLog[],
    currentManagerId: string
  ): string => {
    const monthStart = new Date(month.createdAt);

    // Walk backwards through changes to find the manager at monthStart
    let managerId = currentManagerId;
    // Reverse iterate: latest change first
    for (let i = changes.length - 1; i >= 0; i--) {
      const changeDate = new Date(changes[i].createdAt);
      if (changeDate <= monthStart) {
        // Extract new manager name from description
        const desc = changes[i].description;
        const match = desc.match(/to (.+)$/);
        if (match) {
          const newManagerName = match[1].trim();
          const found = members.find(m => m.fullName === newManagerName);
          if (found) managerId = found.id;
        }
        break;
      }
    }

    return managerId;
  };

  // Manager frequency count
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

  // Assign color per manager
  const managerColorMap = useMemo(() => {
    const uniqueManagers = [...new Set(data.map(d => d.managerId))];
    const map: Record<string, string> = {};
    uniqueManagers.forEach((id, i) => {
      map[id] = COLORS[i % COLORS.length];
    });
    return map;
  }, [data]);

  const chartConfig = useMemo(() => {
    const config: Record<string, { label: string; color: string }> = {};
    Object.entries(managerColorMap).forEach(([id, color]) => {
      const manager = data.find(d => d.managerId === id);
      config[id] = { label: manager?.managerName || 'Unknown', color };
    });
    config.mealRate = { label: 'Meal Rate', color: 'hsl(var(--primary))' };
    return config;
  }, [managerColorMap, data]);

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  if (data.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary" />
          Manager & Meal Rate History
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Chart */}
        <div className="w-full overflow-x-auto">
          <ChartContainer config={chartConfig} className="min-h-[300px] w-full">
            <BarChart data={data} margin={{ top: 20, right: 20, bottom: 60, left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" />
              <XAxis
                dataKey="monthLabel"
                tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                angle={-45}
                textAnchor="end"
                height={80}
              />
              <YAxis
                tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                tickFormatter={(v) => `৳${v}`}
              />
              <ChartTooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const d = payload[0].payload as MonthManagerData;
                  return (
                    <div className="rounded-lg border border-border/50 bg-background px-3 py-2 text-sm shadow-xl">
                      <p className="font-semibold text-foreground">{d.monthLabel}</p>
                      <p className="text-muted-foreground">
                        Manager: <span className="font-medium text-foreground">{d.managerName}</span>
                      </p>
                      <p className="text-muted-foreground">
                        Meal Rate: <span className="font-semibold text-primary">{formatCurrency(d.mealRate)}</span>
                      </p>
                    </div>
                  );
                }}
              />
              <Bar dataKey="mealRate" radius={[6, 6, 0, 0]} maxBarSize={50}>
                {data.map((entry, index) => (
                  <Cell key={index} fill={managerColorMap[entry.managerId] || COLORS[0]} />
                ))}
                <LabelList
                  dataKey="managerName"
                  position="top"
                  style={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                />
              </Bar>
            </BarChart>
          </ChartContainer>
        </div>

        {/* Manager Legend */}
        <div className="flex flex-wrap gap-3">
          {Object.entries(managerColorMap).map(([id, color]) => {
            const manager = data.find(d => d.managerId === id);
            return (
              <div key={id} className="flex items-center gap-1.5 text-xs">
                <div className="h-3 w-3 rounded-sm" style={{ backgroundColor: color }} />
                <span className="text-muted-foreground">{manager?.managerName}</span>
              </div>
            );
          })}
        </div>

        {/* Manager Frequency Summary */}
        <div className="border-t border-border pt-4">
          <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <Crown className="h-4 w-4 text-warning" />
            Manager Frequency
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {managerFrequency.map((item, index) => (
              <div
                key={item.name}
                className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border border-border/50"
              >
                <div className="flex items-center gap-2">
                  <div
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: COLORS[index % COLORS.length] }}
                  />
                  <span className="text-sm font-medium text-foreground">{item.name}</span>
                </div>
                <Badge variant="secondary" className="text-xs">
                  {item.count} {item.count === 1 ? 'time' : 'times'}
                </Badge>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
