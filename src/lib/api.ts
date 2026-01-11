import { API_BASE_URL, USE_BACKEND, setMongoDbConnected, setBackendAvailable, isMongoDbConnected, isBackendAvailable } from './config';
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
    setBackendAvailable(false);
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
      setBackendAvailable(true);
      return connected;
    }
    setMongoDbConnected(false);
    setBackendAvailable(false);
    return false;
  } catch (error) {
    console.error('Backend health check failed:', error);
    setMongoDbConnected(false);
    setBackendAvailable(false);
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
export async function apiRequest<T>(
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
    setBackendAvailable(true);

    return { success: true, data };
  } catch (error) {
    console.error('API request failed:', error);
    setMongoDbConnected(false);
    setBackendAvailable(false);
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
    fullName?: string;
    email: string;
    phone: string;
    role: 'manager' | 'member';
    messId: string | null;
    isApproved?: boolean;
    isActive?: boolean;
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
  phone?: string;
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
  phone?: string;
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

export async function getMessAPI(messId?: string) {
  if (messId) {
    return apiRequest(`/mess/${messId}`, { method: 'GET' });
  }
  return apiRequest('/mess', { method: 'GET' });
}

export async function getMessByCodeAPI(code: string) {
  return apiRequest(`/mess/code/${code}`, { method: 'GET' });
}

export async function searchMessAPI(query: string) {
  return apiRequest(`/mess/search/${encodeURIComponent(query)}`, { method: 'GET' });
}

export async function updateMessAPI(data: { name?: string; messCode?: string }) {
  return apiRequest('/mess', {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteMessAPI() {
  return apiRequest('/mess', { method: 'DELETE' });
}

export async function getMessMembersAPI(messId?: string) {
  if (messId) {
    return apiRequest(`/mess/${messId}/members`, { method: 'GET' });
  }
  return apiRequest('/mess/members', { method: 'GET' });
}

export async function checkMessCodeAPI(code: string) {
  return apiRequest(`/mess-code/check/${code}`, { method: 'GET' });
}

export async function generateMessCodeAPI() {
  return apiRequest('/mess-code/generate', { method: 'GET' });
}

// ============================================
// USER API
// ============================================

export async function getUserByIdAPI(userId: string) {
  return apiRequest(`/users/${userId}`, { method: 'GET' });
}

export async function updateUserAPI(userId: string, data: any) {
  return apiRequest(`/users/${userId}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteUserAPI(userId: string) {
  return apiRequest(`/users/${userId}`, { method: 'DELETE' });
}

export async function getUsersByMessIdAPI(messId: string) {
  return apiRequest(`/mess/${messId}/users`, { method: 'GET' });
}

// ============================================
// MONTH API
// ============================================

export async function getMonthsAPI(messId?: string) {
  if (messId) {
    return apiRequest(`/months?messId=${messId}`, { method: 'GET' });
  }
  return apiRequest('/months', { method: 'GET' });
}

export async function createMonthAPI(data: { name: string; startDate: string; messId?: string }) {
  return apiRequest('/months', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function getActiveMonthAPI(messId?: string) {
  if (messId) {
    return apiRequest(`/months/active?messId=${messId}`, { method: 'GET' });
  }
  return apiRequest('/months/active', { method: 'GET' });
}

export async function updateMonthAPI(monthId: string, data: any) {
  return apiRequest(`/months/${monthId}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

// ============================================
// MEAL API
// ============================================

export async function getMealsAPI(monthId: string) {
  return apiRequest(`/meals?monthId=${monthId}`, { method: 'GET' });
}

export async function createMealAPI(data: any) {
  return apiRequest('/meals', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateMealAPI(id: string, data: any) {
  return apiRequest(`/meals/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteMealAPI(id: string) {
  return apiRequest(`/meals/${id}`, { method: 'DELETE' });
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

export async function getJoinRequestsAPI(messId?: string) {
  if (messId) {
    return apiRequest(`/join-requests?messId=${messId}`, { method: 'GET' });
  }
  return apiRequest('/join-requests', { method: 'GET' });
}

export async function getUserJoinRequestsAPI() {
  return apiRequest('/join-requests/user', { method: 'GET' });
}

export async function createJoinRequestAPI(data: { messId?: string; messCode?: string }) {
  return apiRequest('/join-requests', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function approveJoinRequestAPI(id: string) {
  return apiRequest(`/join-requests/${id}/approve`, { method: 'PUT' });
}

export async function rejectJoinRequestAPI(id: string) {
  return apiRequest(`/join-requests/${id}/reject`, { method: 'PUT' });
}

export async function deleteJoinRequestAPI(id: string) {
  return apiRequest(`/join-requests/${id}`, { method: 'DELETE' });
}

// ============================================
// NOTICE API
// ============================================

export async function getNoticesAPI(messId?: string) {
  if (messId) {
    return apiRequest(`/notices?messId=${messId}`, { method: 'GET' });
  }
  return apiRequest('/notices', { method: 'GET' });
}

export async function getActiveNoticeAPI(messId?: string) {
  if (messId) {
    return apiRequest(`/notices/active?messId=${messId}`, { method: 'GET' });
  }
  return apiRequest('/notices/active', { method: 'GET' });
}

export async function createNoticeAPI(data: { title: string; content: string; messId?: string }) {
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

export async function getBazarDatesAPI(messId?: string) {
  if (messId) {
    return apiRequest(`/bazar-dates?messId=${messId}`, { method: 'GET' });
  }
  return apiRequest('/bazar-dates', { method: 'GET' });
}

export async function createBazarDateAPI(data: { userId: string; userName: string; dates: string[]; messId?: string }) {
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

export async function createNotificationAPI(data: any) {
  return apiRequest('/notifications', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

// ============================================
// NOTE API
// ============================================

export async function getNotesAPI(messId?: string) {
  if (messId) {
    return apiRequest(`/notes?messId=${messId}`, { method: 'GET' });
  }
  return apiRequest('/notes', { method: 'GET' });
}

export async function createNoteAPI(data: { title: string; description: string; messId?: string }) {
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

export async function makeManagerAPI(memberId: string) {
  return apiRequest(`/members/${memberId}/make-manager`, { method: 'PUT' });
}

// ============================================
// SUMMARY/CALCULATION API
// ============================================

export async function getMonthSummaryAPI(monthId: string) {
  return apiRequest(`/summary/month/${monthId}`, { method: 'GET' });
}

export async function getMemberSummaryAPI(userId: string, monthId: string) {
  return apiRequest(`/summary/member/${userId}?monthId=${monthId}`, { method: 'GET' });
}

export async function getAllMembersSummaryAPI(monthId: string) {
  return apiRequest(`/summary/members?monthId=${monthId}`, { method: 'GET' });
}
