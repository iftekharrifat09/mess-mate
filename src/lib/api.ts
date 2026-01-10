import { API_BASE_URL, USE_BACKEND, setMongoDbConnected, isMongoDbConnected } from './config';
import { toast } from '@/hooks/use-toast';

// Token management
const TOKEN_KEY = 'mess_manager_token';

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function removeToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

// Check MongoDB connection status
export async function checkMongoDbStatus(): Promise<boolean> {
  if (!USE_BACKEND) {
    setMongoDbConnected(false);
    return false;
  }

  try {
    const response = await fetch(`${API_BASE_URL.replace('/api', '')}/api/health`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    
    if (response.ok) {
      const data = await response.json();
      const connected = data.mongodb === 'connected';
      setMongoDbConnected(connected);
      return connected;
    }
    setMongoDbConnected(false);
    return false;
  } catch (error) {
    setMongoDbConnected(false);
    return false;
  }
}

// Show localStorage fallback alert
function showLocalStorageFallbackAlert() {
  toast({
    title: "MongoDB not connected",
    description: "Saving data to Local Storage",
    variant: "default",
  });
}

// API request helper
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<{ success: boolean; data?: T; error?: string; usingLocalStorage?: boolean }> {
  if (!USE_BACKEND) {
    return { success: false, error: 'Backend not enabled', usingLocalStorage: true };
  }

  const token = getToken();
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
    ...options.headers,
  };

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
    });

    const data = await response.json();

    if (!response.ok) {
      // Check if it's a MongoDB connection issue
      if (data.mongoDbConnected === false) {
        setMongoDbConnected(false);
        showLocalStorageFallbackAlert();
        return { success: false, error: data.error, usingLocalStorage: true };
      }
      return { success: false, error: data.error || 'Request failed' };
    }

    // Update MongoDB connection status from response
    if (data.mongoDbConnected !== undefined) {
      setMongoDbConnected(data.mongoDbConnected);
    }

    return { success: true, data };
  } catch (error) {
    console.error('API request failed:', error);
    setMongoDbConnected(false);
    return { success: false, error: 'Network error - using local storage', usingLocalStorage: true };
  }
}

// ============================================
// AUTH API
// ============================================

export interface LoginResponse {
  success: boolean;
  user?: {
    id: string;
    name: string;
    email: string;
    phone: string;
    role: 'manager' | 'member';
    messId: string | null;
    emailVerified: boolean;
  };
  token?: string;
  error?: string;
}

export async function loginAPI(email: string, password: string): Promise<LoginResponse> {
  const result = await apiRequest<LoginResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });

  if (result.success && result.data?.token) {
    setToken(result.data.token);
    return result.data;
  }

  if (result.usingLocalStorage) {
    return { success: false, error: 'USE_LOCAL_STORAGE' };
  }

  return { success: false, error: result.error || 'Login failed' };
}

export interface RegisterManagerData {
  name: string;
  email: string;
  password: string;
  messName: string;
}

export async function registerManagerAPI(data: RegisterManagerData): Promise<LoginResponse> {
  const result = await apiRequest<LoginResponse>('/auth/register-manager', {
    method: 'POST',
    body: JSON.stringify(data),
  });

  if (result.success && result.data?.token) {
    setToken(result.data.token);
    return result.data;
  }

  if (result.usingLocalStorage) {
    return { success: false, error: 'USE_LOCAL_STORAGE' };
  }

  return { success: false, error: result.error || 'Registration failed' };
}

export interface RegisterMemberData {
  name: string;
  email: string;
  password: string;
}

export async function registerMemberAPI(data: RegisterMemberData): Promise<LoginResponse> {
  const result = await apiRequest<LoginResponse>('/auth/register-member', {
    method: 'POST',
    body: JSON.stringify(data),
  });

  if (result.success && result.data?.token) {
    setToken(result.data.token);
    return result.data;
  }

  if (result.usingLocalStorage) {
    return { success: false, error: 'USE_LOCAL_STORAGE' };
  }

  return { success: false, error: result.error || 'Registration failed' };
}

export async function getCurrentUserAPI() {
  return apiRequest('/auth/me', { method: 'GET' });
}

export async function updateProfileAPI(data: { name: string; phone: string }) {
  return apiRequest('/auth/profile', {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function changePasswordAPI(data: { currentPassword: string; newPassword: string }) {
  return apiRequest('/auth/change-password', {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

// ============================================
// OTP API
// ============================================

export async function sendOtpAPI(type: string, email: string) {
  return apiRequest('/send-otp', {
    method: 'POST',
    body: JSON.stringify({ type, email }),
  });
}

export async function verifyOtpAPI(type: string, email: string, otp: string) {
  return apiRequest('/verify-otp', {
    method: 'POST',
    body: JSON.stringify({ type, email, otp }),
  });
}

export async function resetPasswordAPI(email: string, newPassword: string) {
  return apiRequest('/reset-password', {
    method: 'POST',
    body: JSON.stringify({ email, newPassword }),
  });
}

// ============================================
// MESS API
// ============================================

export async function getMessAPI() {
  return apiRequest('/mess', { method: 'GET' });
}

export async function updateMessAPI(name: string) {
  return apiRequest('/mess', {
    method: 'PUT',
    body: JSON.stringify({ name }),
  });
}

export async function deleteMessAPI() {
  return apiRequest('/mess', { method: 'DELETE' });
}

export async function getMessMembersAPI() {
  return apiRequest('/mess/members', { method: 'GET' });
}

// ============================================
// MONTH API
// ============================================

export async function getMonthsAPI() {
  return apiRequest('/months', { method: 'GET' });
}

export async function createMonthAPI(data: { name: string; startDate: string }) {
  return apiRequest('/months', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function getActiveMonthAPI() {
  return apiRequest('/months/active', { method: 'GET' });
}

// ============================================
// MEAL API
// ============================================

export async function getMealsAPI(monthId: string) {
  return apiRequest(`/meals?monthId=${monthId}`, { method: 'GET' });
}

export async function saveMealAPI(data: { monthId: string; date: string; meals: Record<string, any> }) {
  return apiRequest('/meals', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateMealAPI(id: string, meals: Record<string, any>) {
  return apiRequest(`/meals/${id}`, {
    method: 'PUT',
    body: JSON.stringify({ meals }),
  });
}

// ============================================
// DEPOSIT API
// ============================================

export async function getDepositsAPI(monthId: string) {
  return apiRequest(`/deposits?monthId=${monthId}`, { method: 'GET' });
}

export async function createDepositAPI(data: any) {
  return apiRequest('/deposits', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateDepositAPI(id: string, data: any) {
  return apiRequest(`/deposits/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteDepositAPI(id: string) {
  return apiRequest(`/deposits/${id}`, { method: 'DELETE' });
}

// ============================================
// MEAL COST API
// ============================================

export async function getMealCostsAPI(monthId: string) {
  return apiRequest(`/meal-costs?monthId=${monthId}`, { method: 'GET' });
}

export async function createMealCostAPI(data: any) {
  return apiRequest('/meal-costs', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateMealCostAPI(id: string, data: any) {
  return apiRequest(`/meal-costs/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteMealCostAPI(id: string) {
  return apiRequest(`/meal-costs/${id}`, { method: 'DELETE' });
}

// ============================================
// OTHER COST API
// ============================================

export async function getOtherCostsAPI(monthId: string) {
  return apiRequest(`/other-costs?monthId=${monthId}`, { method: 'GET' });
}

export async function createOtherCostAPI(data: any) {
  return apiRequest('/other-costs', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateOtherCostAPI(id: string, data: any) {
  return apiRequest(`/other-costs/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteOtherCostAPI(id: string) {
  return apiRequest(`/other-costs/${id}`, { method: 'DELETE' });
}

// ============================================
// JOIN REQUEST API
// ============================================

export async function getJoinRequestsAPI() {
  return apiRequest('/join-requests', { method: 'GET' });
}

export async function createJoinRequestAPI(messCode: string) {
  return apiRequest('/join-requests', {
    method: 'POST',
    body: JSON.stringify({ messCode }),
  });
}

export async function approveJoinRequestAPI(id: string) {
  return apiRequest(`/join-requests/${id}/approve`, { method: 'PUT' });
}

export async function rejectJoinRequestAPI(id: string) {
  return apiRequest(`/join-requests/${id}/reject`, { method: 'PUT' });
}

// ============================================
// NOTICE API
// ============================================

export async function getNoticesAPI() {
  return apiRequest('/notices', { method: 'GET' });
}

export async function getActiveNoticeAPI() {
  return apiRequest('/notices/active', { method: 'GET' });
}

export async function createNoticeAPI(data: { title: string; content: string }) {
  return apiRequest('/notices', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateNoticeAPI(id: string, data: { title?: string; content?: string; isActive?: boolean }) {
  return apiRequest(`/notices/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteNoticeAPI(id: string) {
  return apiRequest(`/notices/${id}`, { method: 'DELETE' });
}

// ============================================
// BAZAR DATE API
// ============================================

export async function getBazarDatesAPI() {
  return apiRequest('/bazar-dates', { method: 'GET' });
}

export async function createBazarDatesAPI(data: { oderId: string; odername: string; dates: string[] }) {
  return apiRequest('/bazar-dates', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function deleteBazarDateAPI(id: string) {
  return apiRequest(`/bazar-dates/${id}`, { method: 'DELETE' });
}

// ============================================
// NOTIFICATION API
// ============================================

export async function getNotificationsAPI() {
  return apiRequest('/notifications', { method: 'GET' });
}

export async function markNotificationReadAPI(id: string) {
  return apiRequest(`/notifications/${id}/read`, { method: 'PUT' });
}

export async function markAllNotificationsReadAPI() {
  return apiRequest('/notifications/read-all', { method: 'PUT' });
}

export async function deleteNotificationAPI(id: string) {
  return apiRequest(`/notifications/${id}`, { method: 'DELETE' });
}

export async function deleteAllNotificationsAPI() {
  return apiRequest('/notifications', { method: 'DELETE' });
}

// ============================================
// NOTE API
// ============================================

export async function getNotesAPI() {
  return apiRequest('/notes', { method: 'GET' });
}

export async function createNoteAPI(data: { title: string; description: string }) {
  return apiRequest('/notes', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateNoteAPI(id: string, data: { title?: string; description?: string }) {
  return apiRequest(`/notes/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteNoteAPI(id: string) {
  return apiRequest(`/notes/${id}`, { method: 'DELETE' });
}

// ============================================
// MEMBER API
// ============================================

export async function removeMemberAPI(id: string) {
  return apiRequest(`/members/${id}`, { method: 'DELETE' });
}
