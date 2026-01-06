import { User, Mess, Month, Meal, Deposit, MealCost, OtherCost, JoinRequest, Notice, BazarDate, Notification, Note } from '@/types';

const STORAGE_KEYS = {
  USERS: 'mess_manager_users',
  MESSES: 'mess_manager_messes',
  MONTHS: 'mess_manager_months',
  MEALS: 'mess_manager_meals',
  DEPOSITS: 'mess_manager_deposits',
  MEAL_COSTS: 'mess_manager_meal_costs',
  OTHER_COSTS: 'mess_manager_other_costs',
  JOIN_REQUESTS: 'mess_manager_join_requests',
  CURRENT_USER: 'mess_manager_current_user',
  NOTICES: 'mess_manager_notices',
  BAZAR_DATES: 'mess_manager_bazar_dates',
  NOTIFICATIONS: 'mess_manager_notifications',
  NOTES: 'mess_manager_notes',
};

function getFromStorage<T>(key: string, defaultValue: T[] = []): T[] {
  const data = localStorage.getItem(key);
  return data ? JSON.parse(data) : defaultValue;
}

function saveToStorage<T>(key: string, data: T[]): void {
  localStorage.setItem(key, JSON.stringify(data));
}

function generateId(): string {
  return crypto.randomUUID();
}

// Users
export function getUsers(): User[] {
  return getFromStorage<User>(STORAGE_KEYS.USERS);
}

export function saveUsers(users: User[]): void {
  saveToStorage(STORAGE_KEYS.USERS, users);
}

export function getUserById(id: string): User | undefined {
  return getUsers().find(u => u.id === id);
}

export function getUserByEmail(email: string): User | undefined {
  return getUsers().find(u => u.email.toLowerCase() === email.toLowerCase());
}

export function createUser(userData: Omit<User, 'id' | 'createdAt'>): User {
  const users = getUsers();
  const newUser: User = {
    ...userData,
    id: generateId(),
    createdAt: new Date().toISOString(),
  };
  users.push(newUser);
  saveUsers(users);
  return newUser;
}

export function updateUser(id: string, updates: Partial<User>): User | undefined {
  const users = getUsers();
  const index = users.findIndex(u => u.id === id);
  if (index !== -1) {
    users[index] = { ...users[index], ...updates };
    saveUsers(users);
    return users[index];
  }
  return undefined;
}

export function deleteUser(id: string): boolean {
  const users = getUsers();
  const filtered = users.filter(u => u.id !== id);
  if (filtered.length !== users.length) {
    saveUsers(filtered);
    return true;
  }
  return false;
}

// Helper to generate unique mess code
function generateMessCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export function generateUniqueMessCode(): string {
  const messes = getMesses();
  let code = generateMessCode();
  let attempts = 0;
  
  // Ensure uniqueness
  while (messes.some(m => m.messCode === code) && attempts < 100) {
    code = generateMessCode();
    attempts++;
  }
  
  return code;
}

// Messes
export function getMesses(): Mess[] {
  return getFromStorage<Mess>(STORAGE_KEYS.MESSES);
}

export function saveMesses(messes: Mess[]): void {
  saveToStorage(STORAGE_KEYS.MESSES, messes);
}

export function getMessById(id: string): Mess | undefined {
  return getMesses().find(m => m.id === id);
}

export function getMessByCode(code: string): Mess | undefined {
  return getMesses().find(m => m.messCode?.toLowerCase() === code.toLowerCase());
}

export function createMess(messData: Omit<Mess, 'id' | 'createdAt' | 'messCode'>): Mess {
  const messes = getMesses();
  const newMess: Mess = {
    ...messData,
    id: generateId(),
    messCode: generateUniqueMessCode(),
    createdAt: new Date().toISOString(),
  };
  messes.push(newMess);
  saveMesses(messes);
  return newMess;
}

export function updateMess(id: string, updates: Partial<Mess>): Mess | undefined {
  const messes = getMesses();
  const index = messes.findIndex(m => m.id === id);
  if (index !== -1) {
    messes[index] = { ...messes[index], ...updates };
    saveMesses(messes);
    return messes[index];
  }
  return undefined;
}

export function isMessCodeUnique(code: string, excludeMessId?: string): boolean {
  const messes = getMesses();
  return !messes.some(m => m.messCode?.toLowerCase() === code.toLowerCase() && m.id !== excludeMessId);
}

// Months
export function getMonths(): Month[] {
  return getFromStorage<Month>(STORAGE_KEYS.MONTHS);
}

export function saveMonths(months: Month[]): void {
  saveToStorage(STORAGE_KEYS.MONTHS, months);
}

export function getMonthsByMessId(messId: string): Month[] {
  return getMonths().filter(m => m.messId === messId);
}

export function getActiveMonth(messId: string): Month | undefined {
  return getMonths().find(m => m.messId === messId && m.isActive);
}

export function createMonth(monthData: Omit<Month, 'id' | 'createdAt'>): Month {
  const months = getMonths();
  
  // Deactivate other months for this mess
  if (monthData.isActive) {
    months.forEach(m => {
      if (m.messId === monthData.messId) {
        m.isActive = false;
      }
    });
  }
  
  const newMonth: Month = {
    ...monthData,
    id: generateId(),
    createdAt: new Date().toISOString(),
  };
  months.push(newMonth);
  saveMonths(months);
  return newMonth;
}

export function updateMonth(id: string, updates: Partial<Month>): Month | undefined {
  const months = getMonths();
  const index = months.findIndex(m => m.id === id);
  if (index !== -1) {
    months[index] = { ...months[index], ...updates };
    saveMonths(months);
    return months[index];
  }
  return undefined;
}

// Meals
export function getMeals(): Meal[] {
  return getFromStorage<Meal>(STORAGE_KEYS.MEALS);
}

export function saveMeals(meals: Meal[]): void {
  saveToStorage(STORAGE_KEYS.MEALS, meals);
}

export function getMealsByMonthId(monthId: string): Meal[] {
  return getMeals().filter(m => m.monthId === monthId);
}

export function getMealsByUserAndMonth(userId: string, monthId: string): Meal[] {
  return getMeals().filter(m => m.userId === userId && m.monthId === monthId);
}

export function createMeal(mealData: Omit<Meal, 'id' | 'createdAt'>): Meal {
  const meals = getMeals();
  const newMeal: Meal = {
    ...mealData,
    id: generateId(),
    createdAt: new Date().toISOString(),
  };
  meals.push(newMeal);
  saveMeals(meals);
  return newMeal;
}

export function updateMeal(id: string, updates: Partial<Meal>): Meal | undefined {
  const meals = getMeals();
  const index = meals.findIndex(m => m.id === id);
  if (index !== -1) {
    meals[index] = { ...meals[index], ...updates };
    saveMeals(meals);
    return meals[index];
  }
  return undefined;
}

export function deleteMeal(id: string): boolean {
  const meals = getMeals();
  const filtered = meals.filter(m => m.id !== id);
  if (filtered.length !== meals.length) {
    saveMeals(filtered);
    return true;
  }
  return false;
}

// Deposits
export function getDeposits(): Deposit[] {
  return getFromStorage<Deposit>(STORAGE_KEYS.DEPOSITS);
}

export function saveDeposits(deposits: Deposit[]): void {
  saveToStorage(STORAGE_KEYS.DEPOSITS, deposits);
}

export function getDepositsByMonthId(monthId: string): Deposit[] {
  return getDeposits().filter(d => d.monthId === monthId);
}

export function getDepositsByUserAndMonth(userId: string, monthId: string): Deposit[] {
  return getDeposits().filter(d => d.userId === userId && d.monthId === monthId);
}

export function createDeposit(depositData: Omit<Deposit, 'id' | 'createdAt'>): Deposit {
  const deposits = getDeposits();
  const newDeposit: Deposit = {
    ...depositData,
    id: generateId(),
    createdAt: new Date().toISOString(),
  };
  deposits.push(newDeposit);
  saveDeposits(deposits);
  return newDeposit;
}

export function updateDeposit(id: string, updates: Partial<Deposit>): Deposit | undefined {
  const deposits = getDeposits();
  const index = deposits.findIndex(d => d.id === id);
  if (index !== -1) {
    deposits[index] = { ...deposits[index], ...updates };
    saveDeposits(deposits);
    return deposits[index];
  }
  return undefined;
}

export function deleteDeposit(id: string): boolean {
  const deposits = getDeposits();
  const filtered = deposits.filter(d => d.id !== id);
  if (filtered.length !== deposits.length) {
    saveDeposits(filtered);
    return true;
  }
  return false;
}

// Meal Costs
export function getMealCosts(): MealCost[] {
  return getFromStorage<MealCost>(STORAGE_KEYS.MEAL_COSTS);
}

export function saveMealCosts(costs: MealCost[]): void {
  saveToStorage(STORAGE_KEYS.MEAL_COSTS, costs);
}

export function getMealCostsByMonthId(monthId: string): MealCost[] {
  return getMealCosts().filter(c => c.monthId === monthId);
}

export function createMealCost(costData: Omit<MealCost, 'id' | 'createdAt'>): MealCost {
  const costs = getMealCosts();
  const newCost: MealCost = {
    ...costData,
    id: generateId(),
    createdAt: new Date().toISOString(),
  };
  costs.push(newCost);
  saveMealCosts(costs);
  return newCost;
}

export function updateMealCost(id: string, updates: Partial<MealCost>): MealCost | undefined {
  const costs = getMealCosts();
  const index = costs.findIndex(c => c.id === id);
  if (index !== -1) {
    costs[index] = { ...costs[index], ...updates };
    saveMealCosts(costs);
    return costs[index];
  }
  return undefined;
}

export function deleteMealCost(id: string): boolean {
  const costs = getMealCosts();
  const filtered = costs.filter(c => c.id !== id);
  if (filtered.length !== costs.length) {
    saveMealCosts(filtered);
    return true;
  }
  return false;
}

// Other Costs
export function getOtherCosts(): OtherCost[] {
  return getFromStorage<OtherCost>(STORAGE_KEYS.OTHER_COSTS);
}

export function saveOtherCosts(costs: OtherCost[]): void {
  saveToStorage(STORAGE_KEYS.OTHER_COSTS, costs);
}

export function getOtherCostsByMonthId(monthId: string): OtherCost[] {
  return getOtherCosts().filter(c => c.monthId === monthId);
}

export function createOtherCost(costData: Omit<OtherCost, 'id' | 'createdAt'>): OtherCost {
  const costs = getOtherCosts();
  const newCost: OtherCost = {
    ...costData,
    id: generateId(),
    createdAt: new Date().toISOString(),
  };
  costs.push(newCost);
  saveOtherCosts(costs);
  return newCost;
}

export function updateOtherCost(id: string, updates: Partial<OtherCost>): OtherCost | undefined {
  const costs = getOtherCosts();
  const index = costs.findIndex(c => c.id === id);
  if (index !== -1) {
    costs[index] = { ...costs[index], ...updates };
    saveOtherCosts(costs);
    return costs[index];
  }
  return undefined;
}

export function deleteOtherCost(id: string): boolean {
  const costs = getOtherCosts();
  const filtered = costs.filter(c => c.id !== id);
  if (filtered.length !== costs.length) {
    saveOtherCosts(filtered);
    return true;
  }
  return false;
}

// Join Requests
export function getJoinRequests(): JoinRequest[] {
  return getFromStorage<JoinRequest>(STORAGE_KEYS.JOIN_REQUESTS);
}

export function saveJoinRequests(requests: JoinRequest[]): void {
  saveToStorage(STORAGE_KEYS.JOIN_REQUESTS, requests);
}

export function getJoinRequestsByMessId(messId: string): JoinRequest[] {
  return getJoinRequests().filter(r => r.messId === messId);
}

export function getJoinRequestsByUserId(userId: string): JoinRequest[] {
  return getJoinRequests().filter(r => r.userId === userId);
}

export function getPendingJoinRequests(messId: string): JoinRequest[] {
  return getJoinRequests().filter(r => r.messId === messId && r.status === 'pending');
}

export function getPendingJoinRequestsForUser(userId: string): JoinRequest[] {
  return getJoinRequests().filter(r => r.userId === userId && r.status === 'pending');
}

export function createJoinRequest(requestData: Omit<JoinRequest, 'id' | 'createdAt'>): JoinRequest {
  const requests = getJoinRequests();
  const newRequest: JoinRequest = {
    ...requestData,
    id: generateId(),
    createdAt: new Date().toISOString(),
  };
  requests.push(newRequest);
  saveJoinRequests(requests);
  return newRequest;
}

export function updateJoinRequest(id: string, updates: Partial<JoinRequest>): JoinRequest | undefined {
  const requests = getJoinRequests();
  const index = requests.findIndex(r => r.id === id);
  if (index !== -1) {
    requests[index] = { ...requests[index], ...updates };
    saveJoinRequests(requests);
    return requests[index];
  }
  return undefined;
}

export function deleteJoinRequest(id: string): boolean {
  const requests = getJoinRequests();
  const filtered = requests.filter(r => r.id !== id);
  if (filtered.length !== requests.length) {
    saveJoinRequests(filtered);
    return true;
  }
  return false;
}

// Delete all pending join requests for a user (except for specified mess)
export function cleanupPendingJoinRequests(userId: string, exceptMessId?: string): void {
  const requests = getJoinRequests();
  const filtered = requests.filter(r => {
    if (r.userId !== userId) return true;
    if (r.status !== 'pending') return true;
    if (exceptMessId && r.messId === exceptMessId) return true;
    return false;
  });
  saveJoinRequests(filtered);
}

// Current User Session
export function getCurrentUser(): User | null {
  const data = localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
  return data ? JSON.parse(data) : null;
}

export function setCurrentUser(user: User | null): void {
  if (user) {
    localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(user));
  } else {
    localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
  }
}

// Helper to get members of a mess
export function getMessMembers(messId: string): User[] {
  return getUsers().filter(u => u.messId === messId && u.isApproved && u.isActive);
}

// ============ NOTICES ============
export function getNotices(): Notice[] {
  return getFromStorage<Notice>(STORAGE_KEYS.NOTICES);
}

export function saveNotices(notices: Notice[]): void {
  saveToStorage(STORAGE_KEYS.NOTICES, notices);
}

export function getNoticesByMessId(messId: string): Notice[] {
  return getNotices().filter(n => n.messId === messId);
}

export function getLatestNotice(messId: string): Notice | undefined {
  const notices = getNoticesByMessId(messId);
  return notices.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
}

export function createNotice(noticeData: Omit<Notice, 'id' | 'createdAt'>): Notice {
  const notices = getNotices();
  const newNotice: Notice = {
    ...noticeData,
    id: generateId(),
    createdAt: new Date().toISOString(),
  };
  notices.push(newNotice);
  saveNotices(notices);
  return newNotice;
}

export function updateNotice(id: string, updates: Partial<Notice>): Notice | undefined {
  const notices = getNotices();
  const index = notices.findIndex(n => n.id === id);
  if (index !== -1) {
    notices[index] = { ...notices[index], ...updates, updatedAt: new Date().toISOString() };
    saveNotices(notices);
    return notices[index];
  }
  return undefined;
}

export function deleteNotice(id: string): boolean {
  const notices = getNotices();
  const filtered = notices.filter(n => n.id !== id);
  if (filtered.length !== notices.length) {
    saveNotices(filtered);
    return true;
  }
  return false;
}

// ============ BAZAR DATES ============
export function getBazarDates(): BazarDate[] {
  return getFromStorage<BazarDate>(STORAGE_KEYS.BAZAR_DATES);
}

export function saveBazarDates(dates: BazarDate[]): void {
  saveToStorage(STORAGE_KEYS.BAZAR_DATES, dates);
}

export function getBazarDatesByMessId(messId: string): BazarDate[] {
  return getBazarDates().filter(b => b.messId === messId);
}

export function createBazarDate(dateData: Omit<BazarDate, 'id' | 'createdAt'>): BazarDate {
  const dates = getBazarDates();
  const newDate: BazarDate = {
    ...dateData,
    id: generateId(),
    createdAt: new Date().toISOString(),
  };
  dates.push(newDate);
  saveBazarDates(dates);
  return newDate;
}

export function updateBazarDate(id: string, updates: Partial<BazarDate>): BazarDate | undefined {
  const dates = getBazarDates();
  const index = dates.findIndex(d => d.id === id);
  if (index !== -1) {
    dates[index] = { ...dates[index], ...updates };
    saveBazarDates(dates);
    return dates[index];
  }
  return undefined;
}

export function deleteBazarDate(id: string): boolean {
  const dates = getBazarDates();
  const filtered = dates.filter(d => d.id !== id);
  if (filtered.length !== dates.length) {
    saveBazarDates(filtered);
    return true;
  }
  return false;
}

// ============ NOTIFICATIONS ============
export function getNotifications(): Notification[] {
  return getFromStorage<Notification>(STORAGE_KEYS.NOTIFICATIONS);
}

export function saveNotifications(notifications: Notification[]): void {
  saveToStorage(STORAGE_KEYS.NOTIFICATIONS, notifications);
}

export function getNotificationsByUserId(userId: string): Notification[] {
  return getNotifications()
    .filter(n => n.userId === userId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export function getUnseenNotificationsCount(userId: string): number {
  return getNotifications().filter(n => n.userId === userId && !n.seen).length;
}

export function createNotification(notificationData: Omit<Notification, 'id' | 'createdAt' | 'seen'>): Notification {
  const notifications = getNotifications();
  const newNotification: Notification = {
    ...notificationData,
    id: generateId(),
    seen: false,
    createdAt: new Date().toISOString(),
  };
  notifications.push(newNotification);
  saveNotifications(notifications);
  return newNotification;
}

export function markNotificationAsSeen(id: string): void {
  const notifications = getNotifications();
  const index = notifications.findIndex(n => n.id === id);
  if (index !== -1) {
    notifications[index].seen = true;
    saveNotifications(notifications);
  }
}

export function markAllNotificationsAsSeen(userId: string): void {
  const notifications = getNotifications();
  notifications.forEach(n => {
    if (n.userId === userId) {
      n.seen = true;
    }
  });
  saveNotifications(notifications);
}

export function deleteNotification(id: string): boolean {
  const notifications = getNotifications();
  const filtered = notifications.filter(n => n.id !== id);
  if (filtered.length !== notifications.length) {
    saveNotifications(filtered);
    return true;
  }
  return false;
}

export function deleteAllNotifications(userId: string): void {
  const notifications = getNotifications();
  const filtered = notifications.filter(n => n.userId !== userId);
  saveNotifications(filtered);
}

// Helper to notify all members of a mess (excluding a specific user)
export function notifyMessMembers(messId: string, excludeUserId: string, notification: { type: Notification['type']; title: string; message: string }): void {
  const members = getMessMembers(messId);
  members.forEach(member => {
    if (member.id !== excludeUserId) {
      createNotification({
        userId: member.id,
        messId,
        ...notification,
      });
    }
  });
}

// Helper to notify manager of a mess
export function notifyManager(messId: string, notification: { type: Notification['type']; title: string; message: string }): void {
  const mess = getMessById(messId);
  if (mess) {
    createNotification({
      userId: mess.managerId,
      messId,
      ...notification,
    });
  }
}

// ============ NOTES ============
export function getNotes(): Note[] {
  return getFromStorage<Note>(STORAGE_KEYS.NOTES);
}

export function saveNotes(notes: Note[]): void {
  saveToStorage(STORAGE_KEYS.NOTES, notes);
}

export function getNotesByMessId(messId: string): Note[] {
  return getNotes()
    .filter(n => n.messId === messId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export function createNote(noteData: Omit<Note, 'id' | 'createdAt'>): Note {
  const notes = getNotes();
  const newNote: Note = {
    ...noteData,
    id: generateId(),
    createdAt: new Date().toISOString(),
  };
  notes.push(newNote);
  saveNotes(notes);
  return newNote;
}

export function updateNote(id: string, updates: Partial<Note>): Note | undefined {
  const notes = getNotes();
  const index = notes.findIndex(n => n.id === id);
  if (index !== -1) {
    notes[index] = { ...notes[index], ...updates, updatedAt: new Date().toISOString() };
    saveNotes(notes);
    return notes[index];
  }
  return undefined;
}

export function deleteNote(id: string): boolean {
  const notes = getNotes();
  const filtered = notes.filter(n => n.id !== id);
  if (filtered.length !== notes.length) {
    saveNotes(filtered);
    return true;
  }
  return false;
}

// ============ DELETE MESS ============
export function deleteMess(messId: string): void {
  // Delete all related data
  const users = getUsers().filter(u => u.messId !== messId);
  saveUsers(users);
  
  const messes = getMesses().filter(m => m.id !== messId);
  saveMesses(messes);
  
  const months = getMonths().filter(m => m.messId !== messId);
  saveMonths(months);
  
  const meals = getMeals().filter(m => {
    const month = getMonths().find(mo => mo.id === m.monthId);
    return month?.messId !== messId;
  });
  saveMeals(meals);
  
  const deposits = getDeposits().filter(d => {
    const month = getMonths().find(mo => mo.id === d.monthId);
    return month?.messId !== messId;
  });
  saveDeposits(deposits);
  
  const mealCosts = getMealCosts().filter(c => {
    const month = getMonths().find(mo => mo.id === c.monthId);
    return month?.messId !== messId;
  });
  saveMealCosts(mealCosts);
  
  const otherCosts = getOtherCosts().filter(c => {
    const month = getMonths().find(mo => mo.id === c.monthId);
    return month?.messId !== messId;
  });
  saveOtherCosts(otherCosts);
  
  const joinRequests = getJoinRequests().filter(r => r.messId !== messId);
  saveJoinRequests(joinRequests);
  
  const notices = getNotices().filter(n => n.messId !== messId);
  saveNotices(notices);
  
  const bazarDates = getBazarDates().filter(b => b.messId !== messId);
  saveBazarDates(bazarDates);
  
  const notifications = getNotifications().filter(n => n.messId !== messId);
  saveNotifications(notifications);
  
  const notes = getNotes().filter(n => n.messId !== messId);
  saveNotes(notes);
}
