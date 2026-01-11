/**
 * Data Service - Unified data layer that tries backend API first, falls back to localStorage
 * This module wraps all data operations and provides a consistent interface.
 */

import { shouldUseBackend, isBackendAvailable, isMongoDbConnected } from './config';
import * as api from './api';
import * as storage from './storage';
import { User, Mess, Month, Meal, Deposit, MealCost, OtherCost, JoinRequest, Notice, BazarDate, Notification, Note } from '@/types';
import { toast } from '@/hooks/use-toast';

// Helper to show localStorage fallback alert
function showFallbackAlert() {
  toast({
    title: "MongoDB not connected",
    description: "Saving data to Local Storage",
    variant: "default",
  });
}

// ============================================
// USERS
// ============================================

export async function getUsers(): Promise<User[]> {
  if (shouldUseBackend()) {
    // For now, this requires a specific API endpoint
    // Fall back to localStorage
  }
  return storage.getUsers();
}

export async function getUserById(id: string): Promise<User | undefined> {
  if (shouldUseBackend()) {
    try {
      const result = await api.getUserByIdAPI(id);
      if (result.success && result.data) {
        const data = result.data as any;
        const user = data.user || data;
        // Ensure fullName is set (backend might only return 'name')
        if (user && !user.fullName && user.name) {
          user.fullName = user.name;
        }
        return user;
      }
    } catch (error) {
      console.error('Error fetching user from API:', error);
    }
  }
  return storage.getUserById(id);
}

export async function getUserByEmail(email: string): Promise<User | undefined> {
  return storage.getUserByEmail(email);
}

export async function updateUser(id: string, updates: Partial<User>): Promise<User | undefined> {
  if (shouldUseBackend()) {
    const result = await api.updateUserAPI(id, updates);
    if (result.success && result.data) {
      return result.data as any;
    }
    if (result.usingLocalStorage) {
      showFallbackAlert();
    }
  }
  return storage.updateUser(id, updates);
}

export async function deleteUser(id: string): Promise<boolean> {
  if (shouldUseBackend()) {
    const result = await api.deleteUserAPI(id);
    if (result.success) {
      return true;
    }
    if (result.usingLocalStorage) {
      showFallbackAlert();
    }
  }
  return storage.deleteUser(id);
}

// ============================================
// MESSES
// ============================================

export async function getMesses(): Promise<Mess[]> {
  return storage.getMesses();
}

export async function getMessById(id: string | undefined): Promise<Mess | undefined> {
  if (!id) return undefined;
  
  if (shouldUseBackend()) {
    try {
      const result = await api.getMessAPI(id);
      console.log('API getMessById result:', result);
      if (result.success && result.data) {
        const data = result.data as any;
        const mess = data.mess || data;
        // Ensure messCode is set (backend returns 'code', we need 'messCode')
        if (mess && !mess.messCode && mess.code) {
          mess.messCode = mess.code;
        }
        return mess;
      }
      // If API call fails but backend is enabled, still try localStorage
      if (result.usingLocalStorage) {
        return storage.getMessById(id);
      }
    } catch (error) {
      console.error('Error fetching mess from API:', error);
      // Fallback to localStorage on error
      return storage.getMessById(id);
    }
  }
  return storage.getMessById(id);
}

export async function getMessByCode(code: string): Promise<Mess | undefined> {
  if (shouldUseBackend()) {
    const result = await api.getMessByCodeAPI(code);
    if (result.success && result.data) {
      return result.data as any;
    }
  }
  return storage.getMessByCode(code);
}

export async function updateMess(id: string, updates: Partial<Mess>): Promise<Mess | undefined> {
  if (shouldUseBackend()) {
    const result = await api.updateMessAPI(updates as any);
    if (result.success && result.data) {
      return result.data as any;
    }
    if (result.usingLocalStorage) {
      showFallbackAlert();
    }
  }
  return storage.updateMess(id, updates);
}

export async function deleteMess(messId: string): Promise<void> {
  if (shouldUseBackend()) {
    const result = await api.deleteMessAPI();
    if (result.success) {
      return;
    }
    if (result.usingLocalStorage) {
      showFallbackAlert();
    }
  }
  storage.deleteMess(messId);
}

export async function generateUniqueMessCode(): Promise<string> {
  if (shouldUseBackend()) {
    const result = await api.generateMessCodeAPI();
    if (result.success && result.data) {
      return (result.data as any).code;
    }
  }
  return storage.generateUniqueMessCode();
}

export async function isMessCodeUnique(code: string, excludeMessId?: string): Promise<boolean> {
  if (shouldUseBackend()) {
    const result = await api.checkMessCodeAPI(code);
    if (result.success && result.data) {
      return (result.data as any).isUnique;
    }
  }
  return storage.isMessCodeUnique(code, excludeMessId);
}

// ============================================
// MONTHS
// ============================================

export async function getMonths(): Promise<Month[]> {
  return storage.getMonths();
}

export async function getMonthsByMessId(messId: string | undefined): Promise<Month[]> {
  if (!messId) return [];
  
  if (shouldUseBackend()) {
    try {
      const result = await api.getMonthsAPI(messId);
      if (result.success && result.data) {
        return (result.data as any).months || result.data || [];
      }
      if (result.usingLocalStorage) {
        return storage.getMonthsByMessId(messId);
      }
    } catch (error) {
      console.error('Error fetching months from API:', error);
      return storage.getMonthsByMessId(messId);
    }
  }
  return storage.getMonthsByMessId(messId);
}

export async function getActiveMonth(messId: string | undefined): Promise<Month | undefined> {
  if (!messId) return undefined;
  
  if (shouldUseBackend()) {
    try {
      const result = await api.getActiveMonthAPI(messId);
      if (result.success && result.data) {
        return (result.data as any).month || result.data;
      }
      // Fallback to localStorage if API fails
      if (result.usingLocalStorage) {
        return storage.getActiveMonth(messId);
      }
    } catch (error) {
      console.error('Error fetching active month from API:', error);
      return storage.getActiveMonth(messId);
    }
  }
  return storage.getActiveMonth(messId);
}

export async function createMonth(monthData: Omit<Month, 'id' | 'createdAt'>): Promise<Month> {
  if (shouldUseBackend()) {
    const result = await api.createMonthAPI(monthData as any);
    if (result.success && result.data) {
      return (result.data as any).month || result.data;
    }
    if (result.usingLocalStorage) {
      showFallbackAlert();
    }
  }
  return storage.createMonth(monthData);
}

export async function updateMonth(id: string, updates: Partial<Month>): Promise<Month | undefined> {
  if (shouldUseBackend()) {
    const result = await api.updateMonthAPI(id, updates);
    if (result.success && result.data) {
      return result.data as any;
    }
    if (result.usingLocalStorage) {
      showFallbackAlert();
    }
  }
  return storage.updateMonth(id, updates);
}

// ============================================
// MEALS
// ============================================

export async function getMealsByMonthId(monthId: string): Promise<Meal[]> {
  if (shouldUseBackend()) {
    const result = await api.getMealsAPI(monthId);
    if (result.success && result.data) {
      return (result.data as any).meals || result.data || [];
    }
  }
  return storage.getMealsByMonthId(monthId);
}

export async function getMealsByUserAndMonth(userId: string, monthId: string): Promise<Meal[]> {
  if (shouldUseBackend()) {
    const meals = await getMealsByMonthId(monthId);
    return meals.filter(m => m.userId === userId);
  }
  return storage.getMealsByUserAndMonth(userId, monthId);
}

export async function createMeal(mealData: Omit<Meal, 'id' | 'createdAt'>): Promise<Meal> {
  if (shouldUseBackend()) {
    const result = await api.createMealAPI(mealData);
    if (result.success && result.data) {
      return (result.data as any).meal || result.data;
    }
    if (result.usingLocalStorage) {
      showFallbackAlert();
    }
  }
  return storage.createMeal(mealData);
}

export async function updateMeal(id: string, updates: Partial<Meal>): Promise<Meal | undefined> {
  if (shouldUseBackend()) {
    const result = await api.updateMealAPI(id, updates);
    if (result.success && result.data) {
      return result.data as any;
    }
    if (result.usingLocalStorage) {
      showFallbackAlert();
    }
  }
  return storage.updateMeal(id, updates);
}

export async function deleteMeal(id: string): Promise<boolean> {
  if (shouldUseBackend()) {
    const result = await api.deleteMealAPI(id);
    if (result.success) {
      return true;
    }
    if (result.usingLocalStorage) {
      showFallbackAlert();
    }
  }
  return storage.deleteMeal(id);
}

// ============================================
// DEPOSITS
// ============================================

export async function getDepositsByMonthId(monthId: string): Promise<Deposit[]> {
  if (shouldUseBackend()) {
    const result = await api.getDepositsAPI(monthId);
    if (result.success && result.data) {
      return (result.data as any).deposits || result.data || [];
    }
  }
  return storage.getDepositsByMonthId(monthId);
}

export async function getDepositsByUserAndMonth(userId: string, monthId: string): Promise<Deposit[]> {
  if (shouldUseBackend()) {
    const deposits = await getDepositsByMonthId(monthId);
    return deposits.filter(d => d.userId === userId);
  }
  return storage.getDepositsByUserAndMonth(userId, monthId);
}

export async function createDeposit(depositData: Omit<Deposit, 'id' | 'createdAt'>): Promise<Deposit> {
  if (shouldUseBackend()) {
    const result = await api.createDepositAPI(depositData);
    if (result.success && result.data) {
      return (result.data as any).deposit || result.data;
    }
    if (result.usingLocalStorage) {
      showFallbackAlert();
    }
  }
  return storage.createDeposit(depositData);
}

export async function updateDeposit(id: string, updates: Partial<Deposit>): Promise<Deposit | undefined> {
  if (shouldUseBackend()) {
    const result = await api.updateDepositAPI(id, updates);
    if (result.success && result.data) {
      return result.data as any;
    }
    if (result.usingLocalStorage) {
      showFallbackAlert();
    }
  }
  return storage.updateDeposit(id, updates);
}

export async function deleteDeposit(id: string): Promise<boolean> {
  if (shouldUseBackend()) {
    const result = await api.deleteDepositAPI(id);
    if (result.success) {
      return true;
    }
    if (result.usingLocalStorage) {
      showFallbackAlert();
    }
  }
  return storage.deleteDeposit(id);
}

// ============================================
// MEAL COSTS
// ============================================

export async function getMealCostsByMonthId(monthId: string): Promise<MealCost[]> {
  if (shouldUseBackend()) {
    const result = await api.getMealCostsAPI(monthId);
    if (result.success && result.data) {
      return (result.data as any).mealCosts || result.data || [];
    }
  }
  return storage.getMealCostsByMonthId(monthId);
}

export async function createMealCost(costData: Omit<MealCost, 'id' | 'createdAt'>): Promise<MealCost> {
  if (shouldUseBackend()) {
    const result = await api.createMealCostAPI(costData);
    if (result.success && result.data) {
      return (result.data as any).mealCost || result.data;
    }
    if (result.usingLocalStorage) {
      showFallbackAlert();
    }
  }
  return storage.createMealCost(costData);
}

export async function updateMealCost(id: string, updates: Partial<MealCost>): Promise<MealCost | undefined> {
  if (shouldUseBackend()) {
    const result = await api.updateMealCostAPI(id, updates);
    if (result.success && result.data) {
      return result.data as any;
    }
    if (result.usingLocalStorage) {
      showFallbackAlert();
    }
  }
  return storage.updateMealCost(id, updates);
}

export async function deleteMealCost(id: string): Promise<boolean> {
  if (shouldUseBackend()) {
    const result = await api.deleteMealCostAPI(id);
    if (result.success) {
      return true;
    }
    if (result.usingLocalStorage) {
      showFallbackAlert();
    }
  }
  return storage.deleteMealCost(id);
}

// ============================================
// OTHER COSTS
// ============================================

export async function getOtherCostsByMonthId(monthId: string): Promise<OtherCost[]> {
  if (shouldUseBackend()) {
    const result = await api.getOtherCostsAPI(monthId);
    if (result.success && result.data) {
      return (result.data as any).otherCosts || result.data || [];
    }
  }
  return storage.getOtherCostsByMonthId(monthId);
}

export async function createOtherCost(costData: Omit<OtherCost, 'id' | 'createdAt'>): Promise<OtherCost> {
  if (shouldUseBackend()) {
    const result = await api.createOtherCostAPI(costData);
    if (result.success && result.data) {
      return (result.data as any).otherCost || result.data;
    }
    if (result.usingLocalStorage) {
      showFallbackAlert();
    }
  }
  return storage.createOtherCost(costData);
}

export async function updateOtherCost(id: string, updates: Partial<OtherCost>): Promise<OtherCost | undefined> {
  if (shouldUseBackend()) {
    const result = await api.updateOtherCostAPI(id, updates);
    if (result.success && result.data) {
      return result.data as any;
    }
    if (result.usingLocalStorage) {
      showFallbackAlert();
    }
  }
  return storage.updateOtherCost(id, updates);
}

export async function deleteOtherCost(id: string): Promise<boolean> {
  if (shouldUseBackend()) {
    const result = await api.deleteOtherCostAPI(id);
    if (result.success) {
      return true;
    }
    if (result.usingLocalStorage) {
      showFallbackAlert();
    }
  }
  return storage.deleteOtherCost(id);
}

// ============================================
// JOIN REQUESTS
// ============================================

export async function getJoinRequests(): Promise<JoinRequest[]> {
  if (shouldUseBackend()) {
    try {
      const result = await api.getJoinRequestsAPI();
      if (result.success && result.data) {
        const data = result.data as any;
        // Handle both 'joinRequests' and 'requests' response formats
        const requests = data.joinRequests || data.requests || data || [];
        return requests;
      }
    } catch (error) {
      console.error('Error fetching join requests from API:', error);
    }
  }
  return storage.getJoinRequests();
}

export async function getJoinRequestsByMessId(messId: string): Promise<JoinRequest[]> {
  if (shouldUseBackend()) {
    const result = await api.getJoinRequestsAPI(messId);
    if (result.success && result.data) {
      return (result.data as any).joinRequests || result.data || [];
    }
  }
  return storage.getJoinRequestsByMessId(messId);
}

export async function getJoinRequestsByUserId(userId: string): Promise<JoinRequest[]> {
  if (shouldUseBackend()) {
    const result = await api.getUserJoinRequestsAPI();
    if (result.success && result.data) {
      return (result.data as any).joinRequests || result.data || [];
    }
  }
  return storage.getJoinRequestsByUserId(userId);
}

export async function getPendingJoinRequests(messId: string): Promise<JoinRequest[]> {
  if (shouldUseBackend()) {
    const requests = await getJoinRequestsByMessId(messId);
    return requests.filter(r => r.status === 'pending');
  }
  return storage.getPendingJoinRequests(messId);
}

export async function getPendingJoinRequestsForUser(userId: string): Promise<JoinRequest[]> {
  if (shouldUseBackend()) {
    const requests = await getJoinRequestsByUserId(userId);
    return requests.filter(r => r.status === 'pending');
  }
  return storage.getPendingJoinRequestsForUser(userId);
}

export async function createJoinRequest(requestData: Omit<JoinRequest, 'id' | 'createdAt'> & { messCode?: string }): Promise<JoinRequest> {
  if (shouldUseBackend()) {
    const result = await api.createJoinRequestAPI({
      messId: requestData.messId,
      // Prefer messCode when available (backend supports both)
      messCode: (requestData as any).messCode,
    });
    if (result.success && result.data) {
      const data = result.data as any;
      return data.joinRequest || data.request || data;
    }
    if (result.usingLocalStorage) {
      showFallbackAlert();
    }
  }
  return storage.createJoinRequest(requestData as any);
}

export async function updateJoinRequest(id: string, updates: Partial<JoinRequest>): Promise<JoinRequest | undefined> {
  return storage.updateJoinRequest(id, updates);
}

export async function deleteJoinRequest(id: string): Promise<boolean> {
  if (shouldUseBackend()) {
    const result = await api.deleteJoinRequestAPI(id);
    if (result.success) {
      return true;
    }
  }
  return storage.deleteJoinRequest(id);
}

export async function approveJoinRequest(id: string): Promise<boolean> {
  if (shouldUseBackend()) {
    const result = await api.approveJoinRequestAPI(id);
    if (result.success) {
      return true;
    }
    if (result.usingLocalStorage) {
      showFallbackAlert();
    }
  }
  // For localStorage, update the request status
  storage.updateJoinRequest(id, { status: 'approved' });
  return true;
}

export async function rejectJoinRequest(id: string): Promise<boolean> {
  if (shouldUseBackend()) {
    const result = await api.rejectJoinRequestAPI(id);
    if (result.success) {
      return true;
    }
    if (result.usingLocalStorage) {
      showFallbackAlert();
    }
  }
  storage.updateJoinRequest(id, { status: 'rejected' });
  return true;
}

export function cleanupPendingJoinRequests(userId: string, exceptMessId?: string): void {
  storage.cleanupPendingJoinRequests(userId, exceptMessId);
}

// ============================================
// MESS MEMBERS
// ============================================

export async function getMessMembers(messId: string | undefined): Promise<User[]> {
  if (!messId) return [];
  
  if (shouldUseBackend()) {
    try {
      const result = await api.getMessMembersAPI(messId);
      console.log('API getMessMembers result:', result);
      if (result.success && result.data) {
        const members = (result.data as any).members || result.data || [];
        // Ensure fullName is set for all members
        return members.map((m: any) => ({
          ...m,
          fullName: m.fullName || m.name,
        }));
      }
      // Fallback to localStorage if API fails
      if (result.usingLocalStorage) {
        return storage.getMessMembers(messId);
      }
    } catch (error) {
      console.error('Error fetching mess members from API:', error);
      return storage.getMessMembers(messId);
    }
  }
  return storage.getMessMembers(messId);
}

// ============================================
// NOTICES
// ============================================

export async function getNoticesByMessId(messId: string): Promise<Notice[]> {
  if (shouldUseBackend()) {
    const result = await api.getNoticesAPI(messId);
    if (result.success && result.data) {
      return (result.data as any).notices || result.data || [];
    }
  }
  return storage.getNoticesByMessId(messId);
}

export async function getLatestNotice(messId: string): Promise<Notice | undefined> {
  if (shouldUseBackend()) {
    const result = await api.getActiveNoticeAPI(messId);
    if (result.success && result.data) {
      return (result.data as any).notice || result.data;
    }
  }
  return storage.getLatestNotice(messId);
}

export async function createNotice(noticeData: Omit<Notice, 'id' | 'createdAt'>): Promise<Notice> {
  if (shouldUseBackend()) {
    const result = await api.createNoticeAPI(noticeData as any);
    if (result.success && result.data) {
      return (result.data as any).notice || result.data;
    }
    if (result.usingLocalStorage) {
      showFallbackAlert();
    }
  }
  return storage.createNotice(noticeData);
}

export async function updateNotice(id: string, updates: Partial<Notice>): Promise<Notice | undefined> {
  if (shouldUseBackend()) {
    const result = await api.updateNoticeAPI(id, updates);
    if (result.success && result.data) {
      return result.data as any;
    }
    if (result.usingLocalStorage) {
      showFallbackAlert();
    }
  }
  return storage.updateNotice(id, updates);
}

export async function deleteNotice(id: string): Promise<boolean> {
  if (shouldUseBackend()) {
    const result = await api.deleteNoticeAPI(id);
    if (result.success) {
      return true;
    }
    if (result.usingLocalStorage) {
      showFallbackAlert();
    }
  }
  return storage.deleteNotice(id);
}

// ============================================
// BAZAR DATES
// ============================================

export async function getBazarDatesByMessId(messId: string | undefined): Promise<BazarDate[]> {
  if (!messId) return [];
  
  if (shouldUseBackend()) {
    try {
      const result = await api.getBazarDatesAPI(messId);
      if (result.success && result.data) {
        return (result.data as any).bazarDates || result.data || [];
      }
      if (result.usingLocalStorage) {
        return storage.getBazarDatesByMessId(messId);
      }
    } catch (error) {
      console.error('Error fetching bazar dates from API:', error);
      return storage.getBazarDatesByMessId(messId);
    }
  }
  return storage.getBazarDatesByMessId(messId);
}

export async function createBazarDate(dateData: Omit<BazarDate, 'id' | 'createdAt'>): Promise<BazarDate> {
  if (shouldUseBackend()) {
    const result = await api.createBazarDateAPI(dateData as any);
    if (result.success && result.data) {
      return (result.data as any).bazarDate || result.data;
    }
    if (result.usingLocalStorage) {
      showFallbackAlert();
    }
  }
  return storage.createBazarDate(dateData);
}

export async function updateBazarDate(id: string, updates: Partial<BazarDate>): Promise<BazarDate | undefined> {
  if (shouldUseBackend()) {
    const result = await api.updateBazarDateAPI(id, updates);
    if (result.success && result.data) {
      return result.data as any;
    }
    if (result.usingLocalStorage) {
      showFallbackAlert();
    }
  }
  return storage.updateBazarDate(id, updates);
}

export async function deleteBazarDate(id: string): Promise<boolean> {
  if (shouldUseBackend()) {
    const result = await api.deleteBazarDateAPI(id);
    if (result.success) {
      return true;
    }
    if (result.usingLocalStorage) {
      showFallbackAlert();
    }
  }
  return storage.deleteBazarDate(id);
}

// ============================================
// NOTIFICATIONS
// ============================================

export async function getNotificationsByUserId(userId: string): Promise<Notification[]> {
  if (shouldUseBackend()) {
    const result = await api.getNotificationsAPI();
    if (result.success && result.data) {
      return (result.data as any).notifications || result.data || [];
    }
  }
  return storage.getNotificationsByUserId(userId);
}

export async function getUnseenNotificationsCount(userId: string): Promise<number> {
  if (shouldUseBackend()) {
    const notifications = await getNotificationsByUserId(userId);
    return notifications.filter(n => !n.seen).length;
  }
  return storage.getUnseenNotificationsCount(userId);
}

export async function createNotification(notificationData: Omit<Notification, 'id' | 'createdAt' | 'seen'>): Promise<Notification> {
  if (shouldUseBackend()) {
    const result = await api.createNotificationAPI(notificationData);
    if (result.success && result.data) {
      return (result.data as any).notification || result.data;
    }
  }
  return storage.createNotification(notificationData);
}

export async function markNotificationAsSeen(id: string): Promise<void> {
  if (shouldUseBackend()) {
    const result = await api.markNotificationReadAPI(id);
    if (result.success) {
      return;
    }
  }
  storage.markNotificationAsSeen(id);
}

export async function markAllNotificationsAsSeen(userId: string): Promise<void> {
  if (shouldUseBackend()) {
    const result = await api.markAllNotificationsReadAPI();
    if (result.success) {
      return;
    }
  }
  storage.markAllNotificationsAsSeen(userId);
}

export async function deleteNotification(id: string): Promise<boolean> {
  if (shouldUseBackend()) {
    const result = await api.deleteNotificationAPI(id);
    if (result.success) {
      return true;
    }
  }
  return storage.deleteNotification(id);
}

export async function deleteAllNotifications(userId: string): Promise<void> {
  if (shouldUseBackend()) {
    const result = await api.deleteAllNotificationsAPI();
    if (result.success) {
      return;
    }
  }
  storage.deleteAllNotifications(userId);
}

export async function notifyMessMembers(messId: string, excludeUserId: string, notification: { type: Notification['type']; title: string; message: string }): Promise<void> {
  storage.notifyMessMembers(messId, excludeUserId, notification);
}

export async function notifyManager(messId: string, notification: { type: Notification['type']; title: string; message: string }): Promise<void> {
  storage.notifyManager(messId, notification);
}

// ============================================
// NOTES
// ============================================

export async function getNotesByMessId(messId: string): Promise<Note[]> {
  if (shouldUseBackend()) {
    const result = await api.getNotesAPI(messId);
    if (result.success && result.data) {
      return (result.data as any).notes || result.data || [];
    }
  }
  return storage.getNotesByMessId(messId);
}

export async function createNote(noteData: Omit<Note, 'id' | 'createdAt'>): Promise<Note> {
  if (shouldUseBackend()) {
    const result = await api.createNoteAPI(noteData as any);
    if (result.success && result.data) {
      return (result.data as any).note || result.data;
    }
    if (result.usingLocalStorage) {
      showFallbackAlert();
    }
  }
  return storage.createNote(noteData);
}

export async function updateNote(id: string, updates: Partial<Note>): Promise<Note | undefined> {
  if (shouldUseBackend()) {
    const result = await api.updateNoteAPI(id, updates);
    if (result.success && result.data) {
      return result.data as any;
    }
    if (result.usingLocalStorage) {
      showFallbackAlert();
    }
  }
  return storage.updateNote(id, updates);
}

export async function deleteNote(id: string): Promise<boolean> {
  if (shouldUseBackend()) {
    const result = await api.deleteNoteAPI(id);
    if (result.success) {
      return true;
    }
    if (result.usingLocalStorage) {
      showFallbackAlert();
    }
  }
  return storage.deleteNote(id);
}

// ============================================
// RE-EXPORTS FROM STORAGE (for backward compatibility)
// ============================================

export { getCurrentUser, setCurrentUser } from './storage';
