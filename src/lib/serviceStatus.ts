import type { ServiceStatus, User } from '@/types';

export const SERVICE_OPTIONS: { value: ServiceStatus; label: string; short: string }[] = [
  { value: 'default', label: 'Default — Meals + Expenses', short: 'Meals + Expenses' },
  { value: 'meals_only', label: 'Meals Only', short: 'Meals Only' },
  { value: 'expenses_only', label: 'Expenses Only', short: 'Expenses Only' },
];

export const getServiceStatus = (u?: Pick<User, 'serviceStatus'> | null): ServiceStatus =>
  (u?.serviceStatus as ServiceStatus) || 'default';

export const hasMealService = (u?: Pick<User, 'serviceStatus'> | null) => getServiceStatus(u) !== 'expenses_only';
export const hasExpenseService = (u?: Pick<User, 'serviceStatus'> | null) => getServiceStatus(u) !== 'meals_only';

export const serviceLabel = (s?: ServiceStatus) => SERVICE_OPTIONS.find(o => o.value === (s || 'default'))!.short;
