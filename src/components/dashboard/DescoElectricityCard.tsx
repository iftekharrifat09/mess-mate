import { useEffect, useState, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Zap, RefreshCw, Wallet, TrendingDown, Calendar, CreditCard,
  Loader2, AlertCircle, Clock, BatteryCharging, Receipt
} from 'lucide-react';
import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, ReferenceLine
} from 'recharts';
import {
  getDescoSettings, fetchAllDescoData,
  DescoData, DescoSettings
} from '@/lib/descoService';

interface DescoElectricityCardProps {
  messId: string;
}

interface DailyDiff {
  date: string;
  label: string;
  taka: number;
  kwh: number;
  cumulativeKwh: number;
  adjustedTaka?: number;
  crossedSlab?: boolean;
}

export default function DescoElectricityCard({ messId }: DescoElectricityCardProps) {
  const [settings, setSettings] = useState<DescoSettings | null>(null);
  const [data, setData] = useState<DescoData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(false);

  const loadData = useCallback(async (force = false) => {
    const s = await getDescoSettings(messId);
    setSettings(s);
    if (!s) { setLoading(false); return; }
    try {
      if (force) setRefreshing(true);
      const result = await fetchAllDescoData(messId, s, force);
      if (result) { setData(result); setError(false); }
      else setError(true);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [messId]);

  useEffect(() => { loadData(); }, [loadData]);

  // Calculate daily differences for current month only
  const dailyDiffs = useMemo((): DailyDiff[] => {
    if (!data?.dailyConsumption?.length) return [];

    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const sorted = [...data.dailyConsumption].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    const diffs: DailyDiff[] = [];
    for (let i = 0; i < sorted.length; i++) {
      const d = new Date(sorted[i].date);
      if (d.getMonth() !== currentMonth || d.getFullYear() !== currentYear) continue;

      let taka: number;
      let kwh: number;

      // Find the previous entry in sorted array (could be prev month)
      const prevIndex = sorted.findIndex((s, idx) => idx < i && new Date(s.date).getTime() < d.getTime());
      const hasPrev = i > 0;

      if (d.getDate() === 1) {
        // 1st of month: consumedTaka resets, so use raw value
        taka = sorted[i].consumedTaka ?? 0;
        // consumedUnit is cumulative and does NOT reset, so diff from previous
        kwh = hasPrev
          ? (sorted[i].consumedUnit ?? 0) - (sorted[i - 1].consumedUnit ?? 0)
          : sorted[i].consumedUnit ?? 0;
      } else if (!hasPrev) {
        taka = sorted[i].consumedTaka ?? 0;
        kwh = sorted[i].consumedUnit ?? 0;
      } else {
        // Subsequent days: diff from previous entry
        taka = (sorted[i].consumedTaka ?? 0) - (sorted[i - 1].consumedTaka ?? 0);
        kwh = (sorted[i].consumedUnit ?? 0) - (sorted[i - 1].consumedUnit ?? 0);
      }

      diffs.push({
        date: sorted[i].date,
        label: d.toLocaleDateString('en-BD', { day: 'numeric', month: 'short' }),
        taka: Math.max(0, parseFloat(taka.toFixed(2))),
        kwh: Math.max(0, parseFloat(kwh.toFixed(2))),
        cumulativeKwh: 0,
      });
    }
    // Calculate cumulative kWh and detect slab crossing
    let cumulative = 0;
    const RETROACTIVE_CHARGE = parseFloat(((5.26 - 4.63) * 50).toFixed(2)); // 31.50
    for (const d of diffs) {
      const prevCumulative = cumulative;
      cumulative += d.kwh;
      d.cumulativeKwh = parseFloat(cumulative.toFixed(2));
      if (prevCumulative < 50 && cumulative >= 50) {
        d.crossedSlab = true;
        d.adjustedTaka = parseFloat(Math.max(0, d.taka - RETROACTIVE_CHARGE).toFixed(2));
      }
    }
    return diffs;
  }, [data]);

  const avgTaka = useMemo(() => {
    if (dailyDiffs.length === 0) return 0;
    return parseFloat((dailyDiffs.reduce((sum, d) => sum + d.taka, 0) / dailyDiffs.length).toFixed(2));
  }, [dailyDiffs]);

  // Determine color thresholds based on average usage
  const getBarColor = useCallback((taka: number) => {
    if (avgTaka === 0) return '#22c55e';
    if (taka <= avgTaka * 0.7) return '#22c55e'; // green - low
    if (taka <= avgTaka * 1.3) return '#f97316'; // orange - average
    return '#ef4444'; // red - excessive
  }, [avgTaka]);

  if (!settings) return null;

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-primary mr-2" />
          <span className="text-muted-foreground">Loading electricity data...</span>
        </CardContent>
      </Card>
    );
  }

  if (error || !data) {
    return (
      <Card className="border-destructive/30">
        <CardContent className="flex flex-col items-center justify-center py-8 gap-3">
          <AlertCircle className="h-8 w-8 text-destructive" />
          <p className="text-muted-foreground text-center text-sm">
            No data found for this account. Check the account number in Manage Mess settings.
          </p>
          <Button variant="outline" size="sm" onClick={() => loadData(true)} disabled={refreshing}>
            {refreshing ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-1" />}
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  const lastUpdated = new Date(data.lastUpdated).toLocaleString('en-BD', {
    dateStyle: 'medium', timeStyle: 'short',
  });

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3 px-4 sm:px-6">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="flex items-center gap-2 text-lg">
            <div className="p-1.5 rounded-lg bg-primary text-primary-foreground">
              <Zap className="h-4 w-4" />
            </div>
            DESCO Electricity
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-[10px]">
              <Clock className="h-2.5 w-2.5 mr-1" />
              {lastUpdated}
            </Badge>
            <Button
              variant="ghost" size="icon" className="h-7 w-7"
              onClick={() => loadData(true)} disabled={refreshing}
            >
              {refreshing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4 px-4 sm:px-6">
        {/* Balance Overview */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
          <motion.div
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            className="bg-accent/10 border border-accent/20 rounded-xl p-2.5 sm:p-3.5 text-center"
          >
            <div className="inline-flex p-2 rounded-full bg-accent/10 mb-1.5">
              <Wallet className="h-4 w-4 text-accent" />
            </div>
            <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider">Balance</p>
            <p className="text-base sm:text-xl font-bold text-accent mt-0.5">
              ৳{data.balance?.balance?.toFixed(2) ?? '0.00'}
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
            className="bg-destructive/10 border border-destructive/20 rounded-xl p-2.5 sm:p-3.5 text-center"
          >
            <div className="inline-flex p-2 rounded-full bg-destructive/10 mb-1.5">
              <TrendingDown className="h-4 w-4 text-destructive" />
            </div>
            <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider">This Month Cost</p>
            <p className="text-base sm:text-xl font-bold text-destructive mt-0.5">
              ৳{data.balance?.currentMonthConsumption?.toFixed(2) ?? '0.00'}
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
            className="bg-primary/10 border border-primary/20 rounded-xl p-2.5 sm:p-3.5 text-center"
          >
            <div className="inline-flex p-2 rounded-full bg-primary/10 mb-1.5">
              <Zap className="h-4 w-4 text-primary" />
            </div>
            <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider">Total Unit</p>
            <p className="text-base sm:text-xl font-bold text-primary mt-0.5">
              {dailyDiffs.reduce((sum, d) => sum + d.kwh, 0).toFixed(2)} kWh
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
            className="bg-secondary border border-border rounded-xl p-2.5 sm:p-3.5 text-center"
          >
            <div className="inline-flex p-2 rounded-full bg-muted mb-1.5">
              <BatteryCharging className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider">Account</p>
            <p className="text-base font-mono font-bold text-foreground mt-0.5">
              {data.balance?.accountNo}
            </p>
          </motion.div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="daily" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="daily" className="text-xs sm:text-sm">
              <Calendar className="h-3.5 w-3.5 mr-1.5" />
              Daily Usage
            </TabsTrigger>
            <TabsTrigger value="recharge" className="text-xs sm:text-sm">
              <Receipt className="h-3.5 w-3.5 mr-1.5" />
              Recharge
            </TabsTrigger>
          </TabsList>

          <TabsContent value="daily" className="mt-3">
            {dailyDiffs.length === 0 ? (
              <p className="text-center text-muted-foreground py-4 text-sm">No daily consumption data for this month</p>
            ) : (
              <div className="space-y-4">
                {/* Slab info note */}
                {(() => {
                  const totalKwh = dailyDiffs.reduce((sum, d) => sum + d.kwh, 0);
                  const slab = getSlabInfo(totalKwh);
                  return (
                    <div className="flex items-center justify-between bg-muted/50 border border-border rounded-lg px-3 py-2 text-[11px]">
                      <span className="text-muted-foreground">
                        Current slab: <span className="font-semibold text-foreground">৳{slab.rate}/kWh</span> ({slab.slab} units)
                      </span>
                      {slab.extraCharge > 0 && (
                        <span className="text-destructive font-medium">
                          +৳{slab.extraCharge.toFixed(2)} retroactive
                        </span>
                      )}
                    </div>
                  );
                })()}

                {/* Legend */}
                <div className="flex items-center justify-center gap-3 sm:gap-4 text-[10px] sm:text-xs text-muted-foreground flex-wrap">
                  <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-[#22c55e]" /> Low</span>
                  <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-[#f97316]" /> Average</span>
                  <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-[#ef4444]" /> High</span>
                  <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-[#8b5cf6]" /> Total kWh</span>
                </div>

                {/* Chart */}
                <div className="h-48 sm:h-56 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={dailyDiffs} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis
                        dataKey="label"
                        tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }}
                        tickLine={false}
                        axisLine={{ stroke: 'hsl(var(--border))' }}
                        interval="preserveStartEnd"
                      />
                      <YAxis
                        yAxisId="taka"
                        tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }}
                        tickLine={false}
                        axisLine={{ stroke: 'hsl(var(--border))' }}
                        width={45}
                      />
                      <YAxis
                        yAxisId="kwh"
                        orientation="right"
                        tick={{ fontSize: 9, fill: '#8b5cf6' }}
                        tickLine={false}
                        axisLine={{ stroke: '#8b5cf6' }}
                        width={40}
                        label={{ value: 'kWh', angle: 90, position: 'insideRight', fontSize: 9, fill: '#8b5cf6' }}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <ReferenceLine
                        yAxisId="taka"
                        y={avgTaka}
                        stroke="#3b82f6"
                        strokeDasharray="6 3"
                        strokeWidth={1.5}
                        label={{ value: `Avg ৳${avgTaka}`, position: 'right', fontSize: 9, fill: '#3b82f6' }}
                      />
                      <Bar dataKey="taka" yAxisId="taka" radius={[4, 4, 0, 0]} maxBarSize={28}>
                        {dailyDiffs.map((entry, i) => (
                          <Cell key={i} fill={getBarColor(entry.taka)} />
                        ))}
                      </Bar>
                      <Line
                        yAxisId="kwh"
                        type="monotone"
                        dataKey="cumulativeKwh"
                        stroke="#8b5cf6"
                        strokeWidth={2}
                        dot={{ r: 2.5, fill: '#8b5cf6' }}
                        name="Total kWh"
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>

              </div>
            )}
          </TabsContent>

          <TabsContent value="recharge" className="mt-3">
            {data.rechargeHistory.length === 0 ? (
              <p className="text-center text-muted-foreground py-4 text-sm">No recharge history available</p>
            ) : (
              <div className="max-h-64 overflow-y-auto space-y-1.5 pr-1 scrollbar-thin">
                {data.rechargeHistory.map((item, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.03 }}
                    className="flex items-center justify-between p-2.5 bg-muted/40 hover:bg-muted/70 rounded-lg text-sm transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <div className="p-1 rounded bg-accent/10">
                        <CreditCard className="h-3 w-3 text-accent" />
                      </div>
                      <span className="text-xs sm:text-sm">{formatDateStr(item.rechargeDate)}</span>
                    </div>
                    <div className="flex items-center gap-2 sm:gap-3">
                      <span className="text-[10px] sm:text-xs text-muted-foreground">
                        VAT ৳{item.VAT?.toFixed(0) ?? '0'}
                      </span>
                      <span className="font-bold text-xs sm:text-sm text-accent">
                        +৳{item.totalAmount?.toFixed(2) ?? '0'}
                      </span>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

// DESCO LT-A Residential Tariff Slabs
function getSlabInfo(totalKwh: number) {
  if (totalKwh <= 50) {
    return { rate: 4.63, slab: '0-50', expectedCost: totalKwh * 4.63, extraCharge: 0 };
  }
  if (totalKwh <= 75) {
    const extraCharge = (5.26 - 4.63) * 50; // 31.50 retroactive
    return { rate: 5.26, slab: '0-75', expectedCost: totalKwh * 5.26, extraCharge };
  }
  if (totalKwh <= 200) {
    const baseCost = 75 * 5.26;
    const extraCharge = (5.26 - 4.63) * 50;
    return { rate: 7.20, slab: '76-200', expectedCost: baseCost + (totalKwh - 75) * 7.20, extraCharge };
  }
  if (totalKwh <= 300) {
    const baseCost = 75 * 5.26 + 125 * 7.20;
    const extraCharge = (5.26 - 4.63) * 50;
    return { rate: 7.59, slab: '201-300', expectedCost: baseCost + (totalKwh - 200) * 7.59, extraCharge };
  }
  if (totalKwh <= 400) {
    const baseCost = 75 * 5.26 + 125 * 7.20 + 100 * 7.59;
    const extraCharge = (5.26 - 4.63) * 50;
    return { rate: 8.02, slab: '301-400', expectedCost: baseCost + (totalKwh - 300) * 8.02, extraCharge };
  }
  const baseCost = 75 * 5.26 + 125 * 7.20 + 100 * 7.59 + 100 * 8.02;
  const extraCharge = (5.26 - 4.63) * 50;
  return { rate: 12.67, slab: '401-600', expectedCost: baseCost + (totalKwh - 400) * 12.67, extraCharge };
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const item = payload[0]?.payload as DailyDiff | undefined;
  if (!item) return null;

  const slab = getSlabInfo(item.cumulativeKwh);
  const displayTaka = item.crossedSlab ? (item.adjustedTaka ?? item.taka) : item.taka;
  const unitRate = item.kwh > 0 ? (displayTaka / item.kwh).toFixed(2) : '0.00';

  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2 text-xs shadow-lg">
      <p className="font-medium text-foreground mb-1">{label}</p>
      {item.crossedSlab ? (
        <>
          <p className="text-muted-foreground line-through">৳{item.taka} spent</p>
          <p className="text-foreground font-medium">৳{displayTaka} actual spent</p>
          <p className="text-destructive text-[10px]">-৳31.50 retroactive charge on first 50 units</p>
        </>
      ) : (
        <p className="text-muted-foreground">৳{displayTaka} spent</p>
      )}
      <p className="text-muted-foreground">{item.kwh} kWh used</p>
      <p className="text-muted-foreground">Unit rate: ৳{unitRate}/kWh</p>
      <p className="text-[#8b5cf6] font-medium mt-0.5">
        Total consumed: {item.cumulativeKwh} kWh
      </p>
      <p className="text-muted-foreground mt-0.5">
        Slab: ৳{slab.rate}/kWh ({slab.slab} units)
      </p>
    </div>
  );
}

function formatDateStr(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString('en-BD', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch {
    return dateStr;
  }
}
