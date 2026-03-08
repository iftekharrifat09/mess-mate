import { shouldUseBackend } from './config';
import * as api from './api';
import { toast } from '@/hooks/use-toast';

export interface CalcCategory {
  id: string;
  messId: string;
  monthId: string;
  title: string;
  totalCost: number;
  status: 'paid' | 'unpaid';
  createdAt: string;
}

export interface CalcException {
  id: string;
  categoryId: string;
  userId: string;
  userName: string;
  amount: number;
}

export interface CalcPayment {
  id: string;
  messId: string;
  monthId: string;
  userId: string;
  userName: string;
  amount: number;
  description: string;
  createdAt: string;
}

export interface CalcBillPayment {
  id: string;
  messId: string;
  monthId: string;
  categoryId: string;
  categoryName: string;
  amount: number;
  description: string;
  createdAt: string;
}

const KEYS = {
  CATEGORIES: 'mess_calc_categories',
  EXCEPTIONS: 'mess_calc_exceptions',
  PAYMENTS: 'mess_calc_payments',
  BILL_PAYMENTS: 'mess_calc_bill_payments',
};

// Helper to show localStorage fallback alert - debounced
let lastFallbackToast = 0;
function showFallbackAlert() {
  const now = Date.now();
  if (now - lastFallbackToast < 5000) return;
  lastFallbackToast = now;
  toast({
    title: "MongoDB not connected",
    description: "Saving data to Local Storage",
    variant: "default",
  });
}

function getLocal<T>(key: string): T[] {
  const d = localStorage.getItem(key);
  return d ? JSON.parse(d) : [];
}
function saveLocal<T>(key: string, data: T[]) {
  localStorage.setItem(key, JSON.stringify(data));
}
function genId() { return crypto.randomUUID(); }

// ============= Categories =============

export async function getCategories(messId: string, monthId: string): Promise<CalcCategory[]> {
  if (shouldUseBackend()) {
    try {
      const result = await api.getCalcCategoriesAPI(messId, monthId);
      if (result.success && result.data) {
        return (result.data as any).categories || [];
      }
      if (result.usingLocalStorage) {
        showFallbackAlert();
      }
    } catch (e) { console.error('Error fetching categories:', e); }
  }
  return getLocal<CalcCategory>(KEYS.CATEGORIES).filter(c => c.messId === messId && c.monthId === monthId);
}

export async function createCategory(data: Omit<CalcCategory, 'id' | 'createdAt'>): Promise<CalcCategory> {
  if (shouldUseBackend()) {
    try {
      const result = await api.createCalcCategoryAPI(data);
      if (result.success && result.data) {
        return (result.data as any).category || result.data;
      }
      if (result.usingLocalStorage) showFallbackAlert();
    } catch (e) { console.error('Error creating category:', e); }
  }
  const all = getLocal<CalcCategory>(KEYS.CATEGORIES);
  const item: CalcCategory = { ...data, id: genId(), createdAt: new Date().toISOString() };
  all.push(item);
  saveLocal(KEYS.CATEGORIES, all);
  return item;
}

export async function updateCategory(id: string, updates: Partial<CalcCategory>): Promise<CalcCategory | undefined> {
  if (shouldUseBackend()) {
    try {
      const result = await api.updateCalcCategoryAPI(id, updates);
      if (result.success && result.data) {
        return (result.data as any).category || result.data;
      }
      if (result.usingLocalStorage) showFallbackAlert();
    } catch (e) { console.error('Error updating category:', e); }
  }
  const all = getLocal<CalcCategory>(KEYS.CATEGORIES);
  const idx = all.findIndex(c => c.id === id);
  if (idx === -1) return undefined;
  all[idx] = { ...all[idx], ...updates };
  saveLocal(KEYS.CATEGORIES, all);
  return all[idx];
}

export async function deleteCategory(id: string): Promise<void> {
  if (shouldUseBackend()) {
    try {
      const result = await api.deleteCalcCategoryAPI(id);
      if (result.success) return;
      if (result.usingLocalStorage) showFallbackAlert();
    } catch (e) { console.error('Error deleting category:', e); }
  }
  saveLocal(KEYS.CATEGORIES, getLocal<CalcCategory>(KEYS.CATEGORIES).filter(c => c.id !== id));
  saveLocal(KEYS.EXCEPTIONS, getLocal<CalcException>(KEYS.EXCEPTIONS).filter(e => e.categoryId !== id));
}

// ============= Exceptions =============

export async function getExceptions(categoryId: string): Promise<CalcException[]> {
  if (shouldUseBackend()) {
    try {
      const result = await api.getCalcExceptionsAPI({ categoryId });
      if (result.success && result.data) {
        return (result.data as any).exceptions || [];
      }
      if (result.usingLocalStorage) showFallbackAlert();
    } catch (e) { console.error('Error fetching exceptions:', e); }
  }
  return getLocal<CalcException>(KEYS.EXCEPTIONS).filter(e => e.categoryId === categoryId);
}

export async function getAllExceptions(messId: string, monthId: string): Promise<CalcException[]> {
  if (shouldUseBackend()) {
    try {
      const result = await api.getCalcExceptionsAPI({ messId, monthId });
      if (result.success && result.data) {
        return (result.data as any).exceptions || [];
      }
      if (result.usingLocalStorage) showFallbackAlert();
    } catch (e) { console.error('Error fetching all exceptions:', e); }
  }
  const cats = getLocal<CalcCategory>(KEYS.CATEGORIES).filter(c => c.messId === messId && c.monthId === monthId);
  const catIds = new Set(cats.map(c => c.id));
  return getLocal<CalcException>(KEYS.EXCEPTIONS).filter(e => catIds.has(e.categoryId));
}

export async function createException(data: Omit<CalcException, 'id'>): Promise<CalcException> {
  if (shouldUseBackend()) {
    try {
      const result = await api.createCalcExceptionAPI(data);
      if (result.success && result.data) {
        return (result.data as any).exception || result.data;
      }
      if (result.usingLocalStorage) showFallbackAlert();
    } catch (e) { console.error('Error creating exception:', e); }
  }
  const all = getLocal<CalcException>(KEYS.EXCEPTIONS);
  const item: CalcException = { ...data, id: genId() };
  all.push(item);
  saveLocal(KEYS.EXCEPTIONS, all);
  return item;
}

export async function deleteException(id: string): Promise<void> {
  if (shouldUseBackend()) {
    try {
      const result = await api.deleteCalcExceptionAPI(id);
      if (result.success) return;
      if (result.usingLocalStorage) showFallbackAlert();
    } catch (e) { console.error('Error deleting exception:', e); }
  }
  saveLocal(KEYS.EXCEPTIONS, getLocal<CalcException>(KEYS.EXCEPTIONS).filter(e => e.id !== id));
}

// ============= Payments =============

export async function getPayments(messId: string, monthId: string): Promise<CalcPayment[]> {
  if (shouldUseBackend()) {
    try {
      const result = await api.getCalcPaymentsAPI(messId, monthId);
      if (result.success && result.data) {
        return (result.data as any).payments || [];
      }
      if (result.usingLocalStorage) showFallbackAlert();
    } catch (e) { console.error('Error fetching payments:', e); }
  }
  return getLocal<CalcPayment>(KEYS.PAYMENTS).filter(p => p.messId === messId && p.monthId === monthId);
}

export async function createPayment(data: Omit<CalcPayment, 'id' | 'createdAt'>): Promise<CalcPayment> {
  if (shouldUseBackend()) {
    try {
      const result = await api.createCalcPaymentAPI(data);
      if (result.success && result.data) {
        return (result.data as any).payment || result.data;
      }
      if (result.usingLocalStorage) showFallbackAlert();
    } catch (e) { console.error('Error creating payment:', e); }
  }
  const all = getLocal<CalcPayment>(KEYS.PAYMENTS);
  const item: CalcPayment = { ...data, id: genId(), createdAt: new Date().toISOString() };
  all.push(item);
  saveLocal(KEYS.PAYMENTS, all);
  return item;
}

export async function updatePayment(id: string, updates: Partial<CalcPayment>): Promise<CalcPayment | undefined> {
  if (shouldUseBackend()) {
    try {
      const result = await api.updateCalcPaymentAPI(id, updates);
      if (result.success && result.data) {
        return (result.data as any).payment || result.data;
      }
      if (result.usingLocalStorage) showFallbackAlert();
    } catch (e) { console.error('Error updating payment:', e); }
  }
  const all = getLocal<CalcPayment>(KEYS.PAYMENTS);
  const idx = all.findIndex(p => p.id === id);
  if (idx === -1) return undefined;
  all[idx] = { ...all[idx], ...updates };
  saveLocal(KEYS.PAYMENTS, all);
  return all[idx];
}

export async function deletePayment(id: string): Promise<void> {
  if (shouldUseBackend()) {
    try {
      const result = await api.deleteCalcPaymentAPI(id);
      if (result.success) return;
      if (result.usingLocalStorage) showFallbackAlert();
    } catch (e) { console.error('Error deleting payment:', e); }
  }
  saveLocal(KEYS.PAYMENTS, getLocal<CalcPayment>(KEYS.PAYMENTS).filter(p => p.id !== id));
}

// ============= Calculation helpers =============

export function calculateMemberDues(
  categories: CalcCategory[],
  exceptions: CalcException[],
  totalMembers: number,
  userId: string
): number {
  let totalDue = 0;

  for (const cat of categories) {
    const catExceptions = exceptions.filter(e => e.categoryId === cat.id);
    const userException = catExceptions.find(e => e.userId === userId);

    if (userException) {
      totalDue += userException.amount;
    } else {
      const totalExceptionAmount = catExceptions.reduce((sum, e) => sum + e.amount, 0);
      const remaining = cat.totalCost - totalExceptionAmount;
      const normalMembers = totalMembers - catExceptions.length;
      totalDue += normalMembers > 0 ? remaining / normalMembers : 0;
    }
  }

  return totalDue;
}
