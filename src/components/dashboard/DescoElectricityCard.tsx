import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Zap, RefreshCw, Wallet, TrendingDown, Calendar, CreditCard,
  Loader2, AlertCircle, Clock, BatteryCharging, Receipt
} from 'lucide-react';
import {
  getDescoSettings, fetchAllDescoData,
  DescoData, DescoSettings
} from '@/lib/descoService';

interface DescoElectricityCardProps {
  messId: string;
}

export default function DescoElectricityCard({ messId }: DescoElectricityCardProps) {
  const [settings, setSettings] = useState<DescoSettings | null>(null);
  const [data, setData] = useState<DescoData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(false);

  const loadData = useCallback(async (force = false) => {
    const s = getDescoSettings(messId);
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

  if (!settings) return null;

  if (loading) {
    return (
      <Card className="border-yellow-500/20 bg-gradient-to-br from-yellow-500/5 to-amber-500/5">
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-yellow-500 mr-2" />
          <span className="text-muted-foreground">Loading electricity data...</span>
        </CardContent>
      </Card>
    );
  }

  if (error || !data) {
    return (
      <Card className="border-destructive/30 bg-gradient-to-br from-destructive/5 to-destructive/10">
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
    <Card className="overflow-hidden border-yellow-500/20 bg-gradient-to-br from-yellow-500/5 via-amber-500/5 to-orange-500/5">
      {/* Glowing top accent */}
      <div className="h-1 bg-gradient-to-r from-yellow-400 via-amber-500 to-orange-500" />

      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="flex items-center gap-2 text-lg">
            <div className="p-1.5 rounded-lg bg-gradient-to-br from-yellow-400 to-amber-500 text-white">
              <Zap className="h-4 w-4" />
            </div>
            DESCO Electricity
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-[10px] border-yellow-500/30 text-yellow-600 dark:text-yellow-400">
              <Clock className="h-2.5 w-2.5 mr-1" />
              {lastUpdated}
            </Badge>
            <Button
              variant="ghost" size="icon" className="h-7 w-7 hover:bg-yellow-500/10"
              onClick={() => loadData(true)} disabled={refreshing}
            >
              {refreshing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Balance Overview Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <motion.div
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            className="bg-gradient-to-br from-emerald-500/15 to-emerald-600/5 border border-emerald-500/20 rounded-xl p-3.5 text-center shadow-sm"
          >
            <div className="inline-flex p-2 rounded-full bg-emerald-500/10 mb-1.5">
              <Wallet className="h-4 w-4 text-emerald-500" />
            </div>
            <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider">Balance</p>
            <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
              ৳{data.balance?.balance?.toFixed(2) ?? '0.00'}
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
            className="bg-gradient-to-br from-rose-500/15 to-rose-600/5 border border-rose-500/20 rounded-xl p-3.5 text-center shadow-sm"
          >
            <div className="inline-flex p-2 rounded-full bg-rose-500/10 mb-1.5">
              <TrendingDown className="h-4 w-4 text-rose-500" />
            </div>
            <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider">This Month</p>
            <p className="text-xl font-bold text-rose-600 dark:text-rose-400 mt-0.5">
              ৳{data.balance?.currentMonthConsumption?.toFixed(2) ?? '0.00'}
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
            className="col-span-2 sm:col-span-1 bg-gradient-to-br from-violet-500/15 to-violet-600/5 border border-violet-500/20 rounded-xl p-3.5 text-center shadow-sm"
          >
            <div className="inline-flex p-2 rounded-full bg-violet-500/10 mb-1.5">
              <BatteryCharging className="h-4 w-4 text-violet-500" />
            </div>
            <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider">Account</p>
            <p className="text-base font-mono font-bold text-violet-600 dark:text-violet-400 mt-0.5">
              {data.balance?.accountNo}
            </p>
          </motion.div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="daily" className="w-full">
          <TabsList className="grid w-full grid-cols-2 bg-yellow-500/10">
            <TabsTrigger value="daily" className="text-xs sm:text-sm data-[state=active]:bg-yellow-500 data-[state=active]:text-white">
              <Calendar className="h-3.5 w-3.5 mr-1.5" />
              Daily Usage
            </TabsTrigger>
            <TabsTrigger value="recharge" className="text-xs sm:text-sm data-[state=active]:bg-yellow-500 data-[state=active]:text-white">
              <Receipt className="h-3.5 w-3.5 mr-1.5" />
              Recharge
            </TabsTrigger>
          </TabsList>

          <TabsContent value="daily" className="mt-3">
            {data.dailyConsumption.length === 0 ? (
              <p className="text-center text-muted-foreground py-4 text-sm">No daily consumption data available</p>
            ) : (
              <div className="max-h-64 overflow-y-auto space-y-1.5 pr-1 scrollbar-thin">
                {data.dailyConsumption.map((item, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.03 }}
                    className="flex items-center justify-between p-2.5 bg-muted/40 hover:bg-muted/70 rounded-lg text-sm transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <div className="p-1 rounded bg-amber-500/10">
                        <Calendar className="h-3 w-3 text-amber-500" />
                      </div>
                      <span className="text-xs sm:text-sm">{formatDateStr(item.date)}</span>
                    </div>
                    <div className="flex items-center gap-2 sm:gap-3">
                      <Badge variant="outline" className="text-[10px] sm:text-xs border-cyan-500/30 text-cyan-600 dark:text-cyan-400">
                        {item.consumedUnit?.toFixed(2) ?? '0'} kWh
                      </Badge>
                      <span className="font-bold text-xs sm:text-sm text-amber-600 dark:text-amber-400">
                        ৳{item.consumedTaka?.toFixed(2) ?? '0'}
                      </span>
                    </div>
                  </motion.div>
                ))}
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
                      <div className="p-1 rounded bg-emerald-500/10">
                        <CreditCard className="h-3 w-3 text-emerald-500" />
                      </div>
                      <span className="text-xs sm:text-sm">{formatDateStr(item.rechargeDate)}</span>
                    </div>
                    <div className="flex items-center gap-2 sm:gap-3">
                      <span className="text-[10px] sm:text-xs text-muted-foreground">
                        VAT ৳{item.VAT?.toFixed(0) ?? '0'}
                      </span>
                      <span className="font-bold text-xs sm:text-sm text-emerald-600 dark:text-emerald-400">
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

function formatDateStr(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString('en-BD', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch {
    return dateStr;
  }
}
