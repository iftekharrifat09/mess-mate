export type UserRole = 'manager' | 'member';

export interface User {
  id: string;
  email: string;
  fullName: string;
  phone: string;
  role: UserRole;
  messId: string;
  isApproved: boolean;
  isActive: boolean;
  createdAt: string;
}

export interface Mess {
  id: string;
  name: string;
  managerId: string;
  createdAt: string;
}

export interface Month {
  id: string;
  messId: string;
  name: string; // e.g., "January 2024"
  year: number;
  month: number;
  isActive: boolean;
  createdAt: string;
}

export interface Meal {
  id: string;
  monthId: string;
  userId: string;
  date: string;
  breakfast: number;
  lunch: number;
  dinner: number;
  createdAt: string;
}

export interface Deposit {
  id: string;
  monthId: string;
  userId: string;
  amount: number;
  date: string;
  note?: string;
  createdAt: string;
}

export interface MealCost {
  id: string;
  monthId: string;
  userId: string;
  amount: number;
  date: string;
  description: string;
  createdAt: string;
}

export interface OtherCost {
  id: string;
  monthId: string;
  userId: string;
  amount: number;
  date: string;
  description: string;
  isShared: boolean;
  createdAt: string;
}

export interface JoinRequest {
  id: string;
  messId: string;
  userId: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
}

export interface MemberSummary {
  userId: string;
  userName: string;
  totalMeals: number;
  totalDeposit: number;
  mealCost: number;
  individualCost: number;
  sharedCost: number;
  balance: number;
}

export interface MonthSummary {
  monthId: string;
  monthName: string;
  messBalance: number;
  totalDeposit: number;
  totalMeals: number;
  totalMealCost: number;
  mealRate: number;
  totalIndividualCost: number;
  totalSharedCost: number;
}
