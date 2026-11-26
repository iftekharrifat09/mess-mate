/** DESCO requests are proxied through the authenticated app server. */

import * as api from './api';

const DATA_CACHE_KEY = 'desco_data_cache_';

export interface DescoSettings {
  accountNo: string;
  hasSession: boolean;
  hasAccount: boolean;
}

export interface DescoBalance {
  accountNo: string;
  balance: number;
  currentMonthConsumption: number;
  readingTime: string;
}

export interface DescoDailyConsumption {
  date: string;
  consumedUnit: number;
  consumedTaka: number;
}

export interface DescoRechargeHistory {
  rechargeDate: string;
  totalAmount: number;
  VAT: number;
  energyAmount: number;
}

export interface DescoData {
  balance: DescoBalance | null;
  realtimeBalance?: unknown;
  summary?: Record<string, unknown>;
  monthlyUsage?: unknown[];
  dailyUsage?: unknown[];
  transactions?: unknown[];
  dailyConsumption: DescoDailyConsumption[];
  rechargeHistory: DescoRechargeHistory[];
  lastUpdated: string;
}

export async function getDescoSettings(_messId: string): Promise<DescoSettings | null> {
  // Remove pre-upgrade browser-held account settings; DESCO credentials now stay on the server.
  try {
    localStorage.removeItem(`desco_settings_${_messId}`);
  } catch {
    // Storage may be unavailable in restricted browser contexts.
  }
  const result = await api.getDescoSettingsAPI();
  if (!result.success || !result.data) return null;
  const data = result.data as { accountNo?: string; hasSession?: boolean; hasAccount?: boolean };
  if (!data.hasSession) return null;
  return {
    accountNo: data.accountNo || '',
    hasSession: true,
    hasAccount: Boolean(data.hasAccount && data.accountNo),
  };
}

export async function saveDescoSession(
  messId: string,
  loginId: string,
  password: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    localStorage.removeItem(DATA_CACHE_KEY + messId);
  } catch {
    // Cache invalidation is best-effort.
  }
  const result = await api.saveDescoSessionAPI({ loginId, password });
  return { success: result.success, error: result.error };
}

export async function verifyDescoAccount(
  messId: string,
  accountNo: string,
): Promise<{ success: boolean; error?: string }> {
  const result = await api.verifyDescoAccountAPI({ accountNo });
  if (result.success) {
    try {
      localStorage.removeItem(DATA_CACHE_KEY + messId);
    } catch {
      // Cache invalidation is best-effort.
    }
  }
  return { success: result.success, error: result.error };
}

export async function removeDescoSettings(_messId: string): Promise<boolean> {
  const result = await api.removeDescoSettingsAPI();
  if (result.success) {
    try {
      localStorage.removeItem(DATA_CACHE_KEY + _messId);
      localStorage.removeItem(`desco_settings_${_messId}`);
    } catch {
      // Browser cache is optional.
    }
  }
  return result.success;
}

export function getCachedDescoData(_messId: string): DescoData | null {
  try {
    const stored = localStorage.getItem(DATA_CACHE_KEY + _messId);
    if (!stored) return null;
    const cached = JSON.parse(stored) as DescoData;
    const updatedAt = new Date(cached.lastUpdated);
    if (!Number.isFinite(updatedAt.getTime())) return null;
    return updatedAt.toDateString() === new Date().toDateString() ? cached : null;
  } catch {
    return null;
  }
}

export async function fetchDescoBalance(_settings: DescoSettings): Promise<DescoBalance | null> {
  const result = await api.getDescoDataAPI();
  if (!result.success || !result.data) return null;
  return (result.data as { data: DescoData }).data.balance;
}

export async function fetchDailyConsumption(_settings: DescoSettings): Promise<DescoDailyConsumption[]> {
  const result = await api.getDescoDataAPI();
  if (!result.success || !result.data) return [];
  return (result.data as { data: DescoData }).data.dailyConsumption || [];
}

export async function fetchRechargeHistory(_settings: DescoSettings): Promise<DescoRechargeHistory[]> {
  const result = await api.getDescoDataAPI();
  if (!result.success || !result.data) return [];
  return (result.data as { data: DescoData }).data.rechargeHistory || [];
}

export async function fetchAllDescoData(
  messId: string,
  _settings: DescoSettings,
  forceRefresh = false,
): Promise<DescoData | null> {
  if (!forceRefresh) {
    const cached = getCachedDescoData(messId);
    if (cached) return cached;
  }
  const result = await api.getDescoDataAPI();
  if (!result.success || !result.data) return null;
  const data = (result.data as { data: DescoData }).data;
  if (data) {
    try {
      localStorage.setItem(DATA_CACHE_KEY + messId, JSON.stringify(data));
    } catch {
      // Cached readings are optional; DESCO credentials are never cached here.
    }
  }
  return data;
}