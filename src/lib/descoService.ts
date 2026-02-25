/**
 * DESCO Electricity Service
 * Handles API calls to DESCO prepaid meter system and local storage of settings
 */

export interface DescoSettings {
  accountNo: string;
  apiType: 'tkdes' | 'unified';
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
  dailyConsumption: DescoDailyConsumption[];
  rechargeHistory: DescoRechargeHistory[];
  lastUpdated: string;
}

const DESCO_BASE = 'https://prepaid.desco.org.bd/api';
const SETTINGS_KEY = 'desco_settings_';
const DATA_CACHE_KEY = 'desco_data_cache_';

// ============= Settings Storage =============

export function getDescoSettings(messId: string): DescoSettings | null {
  try {
    const stored = localStorage.getItem(SETTINGS_KEY + messId);
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
}

export function saveDescoSettings(messId: string, settings: DescoSettings): void {
  localStorage.setItem(SETTINGS_KEY + messId, JSON.stringify(settings));
}

export function removeDescoSettings(messId: string): void {
  localStorage.removeItem(SETTINGS_KEY + messId);
  localStorage.removeItem(DATA_CACHE_KEY + messId);
}

// ============= Data Cache =============

export function getCachedDescoData(messId: string): DescoData | null {
  try {
    const stored = localStorage.getItem(DATA_CACHE_KEY + messId);
    if (!stored) return null;
    const data: DescoData = JSON.parse(stored);
    const lastUpdated = new Date(data.lastUpdated);
    const today = new Date();
    if (lastUpdated.toDateString() === today.toDateString()) {
      return data;
    }
    return null;
  } catch {
    return null;
  }
}

function cacheDescoData(messId: string, data: DescoData): void {
  localStorage.setItem(DATA_CACHE_KEY + messId, JSON.stringify(data));
}

// ============= API Calls =============

async function fetchDescoAPI(url: string): Promise<any> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const json = await response.json();
  if (json.code !== 200) throw new Error(json.message || 'API Error');
  return json.data;
}

export async function fetchDescoBalance(settings: DescoSettings): Promise<DescoBalance | null> {
  try {
    return await fetchDescoAPI(
      `${DESCO_BASE}/${settings.apiType}/customer/getBalance?accountNo=${settings.accountNo}`
    );
  } catch (error) {
    console.error('DESCO Balance fetch error:', error);
    return null;
  }
}

export async function fetchDailyConsumption(settings: DescoSettings): Promise<DescoDailyConsumption[]> {
  try {
    const today = new Date();
    const dateFrom = new Date(today);
    dateFrom.setDate(dateFrom.getDate() - 30);
    return await fetchDescoAPI(
      `${DESCO_BASE}/${settings.apiType}/customer/getCustomerDailyConsumption?accountNo=${settings.accountNo}&dateFrom=${formatDate(dateFrom)}&dateTo=${formatDate(today)}`
    ) || [];
  } catch (error) {
    console.error('DESCO Daily consumption fetch error:', error);
    return [];
  }
}

export async function fetchRechargeHistory(settings: DescoSettings): Promise<DescoRechargeHistory[]> {
  try {
    const today = new Date();
    const dateFrom = new Date(today);
    dateFrom.setMonth(dateFrom.getMonth() - 3);
    return await fetchDescoAPI(
      `${DESCO_BASE}/${settings.apiType}/customer/getRechargeHistory?accountNo=${settings.accountNo}&dateFrom=${formatDate(dateFrom)}&dateTo=${formatDate(today)}`
    ) || [];
  } catch (error) {
    console.error('DESCO Recharge history fetch error:', error);
    return [];
  }
}

export async function fetchAllDescoData(messId: string, settings: DescoSettings, forceRefresh = false): Promise<DescoData | null> {
  if (!forceRefresh) {
    const cached = getCachedDescoData(messId);
    if (cached) return cached;
  }

  try {
    const [balance, daily, recharge] = await Promise.all([
      fetchDescoBalance(settings),
      fetchDailyConsumption(settings),
      fetchRechargeHistory(settings),
    ]);

    if (!balance) return null;

    const data: DescoData = {
      balance,
      dailyConsumption: Array.isArray(daily) ? daily : [],
      rechargeHistory: Array.isArray(recharge) ? recharge : [],
      lastUpdated: new Date().toISOString(),
    };

    cacheDescoData(messId, data);
    return data;
  } catch (error) {
    console.error('DESCO fetch all error:', error);
    return null;
  }
}

// ============= Helpers =============

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}
