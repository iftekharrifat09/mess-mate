import { MemberSummary, MonthSummary, User, Meal, Deposit, MealCost, OtherCost } from '@/types';
import * as dataService from '@/lib/dataService';

/**
 * Pre-fetched data bundle to avoid redundant API calls.
 * Fetch once, pass to all calculation functions.
 */
export interface MonthData {
  members: User[];
  meals: Meal[];
  deposits: Deposit[];
  mealCosts: MealCost[];
  otherCosts: OtherCost[];
  monthName: string;
}

/**
 * Fetch all month data in a single parallel batch.
 * This is the key optimization — one round of API calls instead of N×6.
 */
export async function fetchMonthData(monthId: string, messId: string): Promise<MonthData> {
  const [month, members, meals, deposits, mealCosts, otherCosts] = await Promise.all([
    dataService.getActiveMonth(messId),
    dataService.getMessMembers(messId),
    dataService.getMealsByMonthId(monthId),
    dataService.getDepositsByMonthId(monthId),
    dataService.getMealCostsByMonthId(monthId),
    dataService.getOtherCostsByMonthId(monthId),
  ]);

  return {
    members: members || [],
    meals: meals || [],
    deposits: deposits || [],
    mealCosts: mealCosts || [],
    otherCosts: otherCosts || [],
    monthName: month?.name || 'Current Month',
  };
}

/**
 * Calculate member summary using pre-fetched data (no API calls).
 */
export function calculateMemberSummaryFromData(
  userId: string,
  data: MonthData
): MemberSummary {
  const user = data.members.find(m => m.id === userId);
  const userMeals = data.meals.filter(m => m.userId === userId);
  const userDeposits = data.deposits.filter(d => d.userId === userId);

  const totalMeals = userMeals.reduce((sum, m) => sum + m.breakfast + m.lunch + m.dinner, 0);
  const totalDeposit = userDeposits.reduce((sum, d) => sum + d.amount, 0);
  const totalMealCost = data.mealCosts.reduce((sum, c) => sum + c.amount, 0);
  const totalMonthMeals = data.meals.reduce((sum, m) => sum + m.breakfast + m.lunch + m.dinner, 0);
  const mealRate = totalMonthMeals > 0 ? totalMealCost / totalMonthMeals : 0;
  const userMealCost = totalMeals * mealRate;

  const individualCost = data.otherCosts
    .filter(c => c.userId === userId && !c.isShared)
    .reduce((sum, c) => sum + c.amount, 0);

  const memberCount = data.members.length || 1;
  const totalSharedCost = data.otherCosts
    .filter(c => c.isShared)
    .reduce((sum, c) => sum + c.amount, 0);
  const sharedCostPerMember = totalSharedCost / memberCount;

  const totalCost = userMealCost + individualCost + sharedCostPerMember;
  const balance = totalDeposit - totalCost;

  return {
    userId,
    userName: user?.fullName || 'Unknown',
    totalMeals,
    totalDeposit,
    mealCost: userMealCost,
    individualCost,
    sharedCost: sharedCostPerMember,
    balance,
  };
}

/**
 * Calculate month summary using pre-fetched data (no API calls).
 */
export function calculateMonthSummaryFromData(
  monthId: string,
  data: MonthData
): MonthSummary {
  const totalMeals = data.meals.reduce((sum, m) => sum + m.breakfast + m.lunch + m.dinner, 0);
  const totalDeposit = data.deposits.reduce((sum, d) => sum + d.amount, 0);
  const totalMealCost = data.mealCosts.reduce((sum, c) => sum + c.amount, 0);
  const mealRate = totalMeals > 0 ? totalMealCost / totalMeals : 0;

  const totalIndividualCost = data.otherCosts
    .filter(c => !c.isShared)
    .reduce((sum, c) => sum + c.amount, 0);

  const totalSharedCost = data.otherCosts
    .filter(c => c.isShared)
    .reduce((sum, c) => sum + c.amount, 0);

  const totalExpense = totalMealCost + totalIndividualCost + totalSharedCost;
  const messBalance = totalDeposit - totalExpense;

  return {
    monthId,
    monthName: data.monthName,
    messBalance,
    totalDeposit,
    totalMeals,
    totalMealCost,
    mealRate,
    totalIndividualCost,
    totalSharedCost,
  };
}

/**
 * Get all members' summaries using pre-fetched data (no API calls).
 */
export function getAllMembersSummaryFromData(
  data: MonthData
): MemberSummary[] {
  return data.members.map(member => calculateMemberSummaryFromData(member.id, data));
}

// ---- Legacy API-calling versions (kept for backward compatibility) ----

export async function calculateMemberSummary(userId: string, monthId: string): Promise<MemberSummary> {
  const user = await dataService.getUserById(userId);
  const messId = user?.messId || '';
  const data = await fetchMonthData(monthId, messId);
  return calculateMemberSummaryFromData(userId, data);
}

export async function calculateMonthSummary(monthId: string, messId: string): Promise<MonthSummary> {
  const data = await fetchMonthData(monthId, messId);
  return calculateMonthSummaryFromData(monthId, data);
}

export async function getAllMembersSummary(monthId: string, messId: string): Promise<MemberSummary[]> {
  const data = await fetchMonthData(monthId, messId);
  return getAllMembersSummaryFromData(data);
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'BDT',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatNumber(num: number): string {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(num);
}
