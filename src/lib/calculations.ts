import { MemberSummary, MonthSummary } from '@/types';
import * as dataService from '@/lib/dataService';

export async function calculateMemberSummary(userId: string, monthId: string): Promise<MemberSummary> {
  const user = await dataService.getUserById(userId);
  const meals = await dataService.getMealsByMonthId(monthId);
  const userMeals = meals.filter(m => m.userId === userId);
  const deposits = await dataService.getDepositsByMonthId(monthId);
  const userDeposits = deposits.filter(d => d.userId === userId);
  const mealCosts = await dataService.getMealCostsByMonthId(monthId);
  const otherCosts = await dataService.getOtherCostsByMonthId(monthId);

  // Calculate total meals for this user
  const totalMeals = userMeals.reduce((sum, m) => sum + m.breakfast + m.lunch + m.dinner, 0);

  // Calculate total deposit for this user
  const totalDeposit = userDeposits.reduce((sum, d) => sum + d.amount, 0);

  // Calculate total meal cost for the month
  const totalMealCost = mealCosts.reduce((sum, c) => sum + c.amount, 0);

  // Calculate total meals in the month (all users)
  const totalMonthMeals = meals.reduce((sum, m) => sum + m.breakfast + m.lunch + m.dinner, 0);

  // Calculate meal rate
  const mealRate = totalMonthMeals > 0 ? totalMealCost / totalMonthMeals : 0;

  // Calculate meal cost for this user
  const userMealCost = totalMeals * mealRate;

  // Calculate individual cost (non-shared other costs for this user)
  const individualCost = otherCosts
    .filter(c => c.userId === userId && !c.isShared)
    .reduce((sum, c) => sum + c.amount, 0);

  // Calculate shared cost (divided among all members)
  const members = await dataService.getMessMembers(user?.messId || '');
  const memberCount = members.length || 1;
  const totalSharedCost = otherCosts
    .filter(c => c.isShared)
    .reduce((sum, c) => sum + c.amount, 0);
  const sharedCostPerMember = totalSharedCost / memberCount;

  // Calculate balance
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

export async function calculateMonthSummary(monthId: string, messId: string): Promise<MonthSummary> {
  const month = await dataService.getActiveMonth(messId);
  const members = await dataService.getMessMembers(messId);
  const meals = await dataService.getMealsByMonthId(monthId);
  const deposits = await dataService.getDepositsByMonthId(monthId);
  const mealCosts = await dataService.getMealCostsByMonthId(monthId);
  const otherCosts = await dataService.getOtherCostsByMonthId(monthId);

  const totalMeals = meals.reduce((sum, m) => sum + m.breakfast + m.lunch + m.dinner, 0);
  const totalDeposit = deposits.reduce((sum, d) => sum + d.amount, 0);
  const totalMealCost = mealCosts.reduce((sum, c) => sum + c.amount, 0);
  const mealRate = totalMeals > 0 ? totalMealCost / totalMeals : 0;

  const totalIndividualCost = otherCosts
    .filter(c => !c.isShared)
    .reduce((sum, c) => sum + c.amount, 0);

  const totalSharedCost = otherCosts
    .filter(c => c.isShared)
    .reduce((sum, c) => sum + c.amount, 0);

  const totalExpense = totalMealCost + totalIndividualCost + totalSharedCost;
  const messBalance = totalDeposit - totalExpense;

  return {
    monthId,
    monthName: month?.name || 'Current Month',
    messBalance,
    totalDeposit,
    totalMeals,
    totalMealCost,
    mealRate,
    totalIndividualCost,
    totalSharedCost,
  };
}

export async function getAllMembersSummary(monthId: string, messId: string): Promise<MemberSummary[]> {
  const members = await dataService.getMessMembers(messId);
  const summaries = await Promise.all(
    members.map(member => calculateMemberSummary(member.id, monthId))
  );
  return summaries;
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
