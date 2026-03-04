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

const KEYS = {
  CATEGORIES: 'mess_calc_categories',
  EXCEPTIONS: 'mess_calc_exceptions',
  PAYMENTS: 'mess_calc_payments',
};

function get<T>(key: string): T[] {
  const d = localStorage.getItem(key);
  return d ? JSON.parse(d) : [];
}
function save<T>(key: string, data: T[]) {
  localStorage.setItem(key, JSON.stringify(data));
}
function genId() { return crypto.randomUUID(); }

// Categories
export function getCategories(messId: string, monthId: string): CalcCategory[] {
  return get<CalcCategory>(KEYS.CATEGORIES).filter(c => c.messId === messId && c.monthId === monthId);
}
export function createCategory(data: Omit<CalcCategory, 'id' | 'createdAt'>): CalcCategory {
  const all = get<CalcCategory>(KEYS.CATEGORIES);
  const item: CalcCategory = { ...data, id: genId(), createdAt: new Date().toISOString() };
  all.push(item);
  save(KEYS.CATEGORIES, all);
  return item;
}
export function updateCategory(id: string, updates: Partial<CalcCategory>): CalcCategory | undefined {
  const all = get<CalcCategory>(KEYS.CATEGORIES);
  const idx = all.findIndex(c => c.id === id);
  if (idx === -1) return undefined;
  all[idx] = { ...all[idx], ...updates };
  save(KEYS.CATEGORIES, all);
  return all[idx];
}
export function deleteCategory(id: string) {
  save(KEYS.CATEGORIES, get<CalcCategory>(KEYS.CATEGORIES).filter(c => c.id !== id));
  // Also delete related exceptions
  save(KEYS.EXCEPTIONS, get<CalcException>(KEYS.EXCEPTIONS).filter(e => e.categoryId !== id));
}

// Exceptions
export function getExceptions(categoryId: string): CalcException[] {
  return get<CalcException>(KEYS.EXCEPTIONS).filter(e => e.categoryId === categoryId);
}
export function getAllExceptions(messId: string, monthId: string): CalcException[] {
  const cats = getCategories(messId, monthId);
  const catIds = new Set(cats.map(c => c.id));
  return get<CalcException>(KEYS.EXCEPTIONS).filter(e => catIds.has(e.categoryId));
}
export function createException(data: Omit<CalcException, 'id'>): CalcException {
  const all = get<CalcException>(KEYS.EXCEPTIONS);
  const item: CalcException = { ...data, id: genId() };
  all.push(item);
  save(KEYS.EXCEPTIONS, all);
  return item;
}
export function deleteException(id: string) {
  save(KEYS.EXCEPTIONS, get<CalcException>(KEYS.EXCEPTIONS).filter(e => e.id !== id));
}

// Payments
export function getPayments(messId: string, monthId: string): CalcPayment[] {
  return get<CalcPayment>(KEYS.PAYMENTS).filter(p => p.messId === messId && p.monthId === monthId);
}
export function createPayment(data: Omit<CalcPayment, 'id' | 'createdAt'>): CalcPayment {
  const all = get<CalcPayment>(KEYS.PAYMENTS);
  const item: CalcPayment = { ...data, id: genId(), createdAt: new Date().toISOString() };
  all.push(item);
  save(KEYS.PAYMENTS, all);
  return item;
}
export function updatePayment(id: string, updates: Partial<CalcPayment>): CalcPayment | undefined {
  const all = get<CalcPayment>(KEYS.PAYMENTS);
  const idx = all.findIndex(p => p.id === id);
  if (idx === -1) return undefined;
  all[idx] = { ...all[idx], ...updates };
  save(KEYS.PAYMENTS, all);
  return all[idx];
}
export function deletePayment(id: string) {
  save(KEYS.PAYMENTS, get<CalcPayment>(KEYS.PAYMENTS).filter(p => p.id !== id));
}

// Calculation helpers
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
