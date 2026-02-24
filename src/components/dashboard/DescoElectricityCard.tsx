import { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Zap, RefreshCw, Wallet, TrendingDown, Calendar, CreditCard,
  Loader2, AlertCircle, Clock
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
    if (!s) {
      setLoading(false);
      return;
    }

    try {
      if (force) setRefreshing(true);
      const result = await fetchAllDescoData(messId, s, force);
      if (result) {
        setData(result);
        setError(false);
      } else {
        setError(true);
      }
    } catch {
      setError(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [messId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Don't render if no settings configured
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
          <p className="text-muted-foreground text-center">
            No data found for this account. Please check the account number and meter number in Manage Mess settings.
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
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Zap className="h-5 w-5 text-yellow-500" />
            DESCO Electricity
          </CardTitle>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {lastUpdated}
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => loadData(true)}
              disabled={refreshing}
            >
              {refreshing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Balance Overview */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <div className="bg-gradient-to-br from-green-500/10 to-green-600/5 border border-green-500/20 rounded-lg p-3 text-center">
            <Wallet className="h-5 w-5 text-green-500 mx-auto mb-1" />
            <p className="text-xs text-muted-foreground">Balance</p>
            <p className="text-lg font-bold text-green-600 dark:text-green-400">
              ৳{data.balance?.balance?.toFixed(2) ?? '0.00'}
            </p>
          </div>
          <div className="bg-gradient-to-br from-orange-500/10 to-orange-600/5 border border-orange-500/20 rounded-lg p-3 text-center">
            <TrendingDown className="h-5 w-5 text-orange-500 mx-auto mb-1" />
            <p className="text-xs text-muted-foreground">This Month</p>
            <p className="text-lg font-bold text-orange-600 dark:text-orange-400">
              ৳{data.balance?.currentMonthConsumption?.toFixed(2) ?? '0.00'}
            </p>
          </div>
          <div className="col-span-2 sm:col-span-1 bg-gradient-to-br from-blue-500/10 to-blue-600/5 border border-blue-500/20 rounded-lg p-3 text-center">
            <Zap className="h-5 w-5 text-blue-500 mx-auto mb-1" />
            <p className="text-xs text-muted-foreground">Account</p>
            <p className="text-sm font-mono font-bold text-blue-600 dark:text-blue-400">
              {data.balance?.accountNo}
            </p>
          </div>
        </div>

        {/* Tabs for detailed data */}
        <Tabs defaultValue="daily" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="daily" className="text-xs sm:text-sm">Daily</TabsTrigger>
            <TabsTrigger value="monthly" className="text-xs sm:text-sm">Monthly</TabsTrigger>
            <TabsTrigger value="recharge" className="text-xs sm:text-sm">Recharge</TabsTrigger>
          </TabsList>

          <TabsContent value="daily" className="mt-3">
            {data.dailyConsumption.length === 0 ? (
              <p className="text-center text-muted-foreground py-4 text-sm">No daily consumption data available</p>
            ) : (
              <div className="max-h-60 overflow-y-auto space-y-1.5 pr-1">
                {data.dailyConsumption.slice(0, 15).map((item, i) => (
                  <div key={i} className="flex items-center justify-between p-2.5 bg-muted/50 rounded-md text-sm">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                      <span>{formatDateStr(item.date)}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant="outline" className="text-xs">
                        {item.consumption?.toFixed(2) ?? '0'} kWh
                      </Badge>
                      <span className="font-semibold text-foreground">৳{item.amount?.toFixed(2) ?? '0'}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="monthly" className="mt-3">
            {data.monthlyConsumption.length === 0 ? (
              <p className="text-center text-muted-foreground py-4 text-sm">No monthly consumption data available</p>
            ) : (
              <div className="max-h-60 overflow-y-auto space-y-1.5 pr-1">
                {data.monthlyConsumption.map((item, i) => (
                  <div key={i} className="flex items-center justify-between p-2.5 bg-muted/50 rounded-md text-sm">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                      <span>{item.month}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant="outline" className="text-xs">
                        {item.consumption?.toFixed(2) ?? '0'} kWh
                      </Badge>
                      <span className="font-semibold text-foreground">৳{item.amount?.toFixed(2) ?? '0'}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="recharge" className="mt-3">
            {data.rechargeHistory.length === 0 ? (
              <p className="text-center text-muted-foreground py-4 text-sm">No recharge history available</p>
            ) : (
              <div className="max-h-60 overflow-y-auto space-y-1.5 pr-1">
                {data.rechargeHistory.map((item, i) => (
                  <div key={i} className="flex items-center justify-between p-2.5 bg-muted/50 rounded-md text-sm">
                    <div className="flex items-center gap-2">
                      <CreditCard className="h-3.5 w-3.5 text-muted-foreground" />
                      <span>{formatDateStr(item.date)}</span>
                    </div>
                    <span className="font-semibold text-green-600 dark:text-green-400">
                      +৳{item.amount?.toFixed(2) ?? '0'}
                    </span>
                  </div>
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
