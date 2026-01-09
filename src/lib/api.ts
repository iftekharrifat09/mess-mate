import { CONFIG } from './config';
import { User, Mess, Month, Meal, Deposit, MealCost, OtherCost, JoinRequest, Notice, BazarDate, Notification, Note } from '@/types';

const { baseUrl } = CONFIG.api;

// Token management
let authToken: string | null = localStorage.getItem('auth_token');

export function setAuthToken(token: string | null) {
  authToken = token;
  if (token) {
    localStorage.setItem('auth_token', token);
  } else {
    localStorage.removeItem('auth_token');
  }
}

export function getAuthToken(): string | null {
  return authToken;
}

// Helper function for API calls
async function apiCall<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${baseUrl}${endpoint}`;
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...options.headers as Record<string, string>,
  };

  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }

  const config: RequestInit = {
    ...options,
    headers,
  };

  const response = await fetch(url, config);
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'API request failed');
  }

  return data;
}

// ============ AUTH API ============
export const authAPI = {
  login: async (email: string, password: string) => {
    const result = await apiCall<{ success: boolean; user?: any; token?: string; error?: string }>(
      '/auth/login',
      {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      }
    );
    if (result.token) {
      setAuthToken(result.token);
    }
    return result;
  },

  registerManager: async (data: {
    fullName: string;
    messName: string;
    phone: string;
    email: string;
    password: string;
  }) => {
    const result = await apiCall<{ success: boolean; user?: any; mess?: any; token?: string; error?: string }>(
      '/auth/register-manager',
      {
        method: 'POST',
        body: JSON.stringify({
          name: data.fullName,
          email: data.email,
          password: data.password,
          messName: data.messName,
          phone: data.phone,
        }),
      }
    );
    if (result.token) {
      setAuthToken(result.token);
    }
    return result;
  },

  registerMember: async (data: {
    fullName: string;
    phone: string;
    email: string;
    password: string;
    messId?: string;
  }) => {
    const result = await apiCall<{ success: boolean; user?: any; token?: string; error?: string }>(
      '/auth/register-member',
      {
        method: 'POST',
        body: JSON.stringify({
          name: data.fullName,
          email: data.email,
          password: data.password,
          phone: data.phone,
        }),
      }
    );
    if (result.token) {
      setAuthToken(result.token);
    }
    return result;
  },

  getCurrentUser: async () => {
    return apiCall<{ success: boolean; user?: any; error?: string }>('/auth/me');
  },

  updateProfile: async (data: { name?: string; phone?: string }) => {
    return apiCall<{ success: boolean; user?: any; error?: string }>(
      '/auth/profile',
      {
        method: 'PUT',
        body: JSON.stringify(data),
      }
    );
  },

  changePassword: async (currentPassword: string, newPassword: string) => {
    return apiCall<{ success: boolean; error?: string }>(
      '/auth/change-password',
      {
        method: 'PUT',
        body: JSON.stringify({ currentPassword, newPassword }),
      }
    );
  },

  logout: () => {
    setAuthToken(null);
  },
};

// ============ OTP API ============
export const otpAPI = {
  sendOTP: async (type: 'FORGOT_PASSWORD' | 'VERIFY_EMAIL' | 'CHANGE_EMAIL', email: string) => {
    return apiCall<{ success: boolean; message?: string; error?: string }>(
      '/send-otp',
      {
        method: 'POST',
        body: JSON.stringify({ type, email }),
      }
    );
  },

  verifyOTP: async (type: string, email: string, otp: string) => {
    return apiCall<{ success: boolean; error?: string }>(
      '/verify-otp',
      {
        method: 'POST',
        body: JSON.stringify({ type, email, otp }),
      }
    );
  },

  resetPassword: async (email: string, newPassword: string) => {
    return apiCall<{ success: boolean; error?: string }>(
      '/reset-password',
      {
        method: 'POST',
        body: JSON.stringify({ email, newPassword }),
      }
    );
  },
};

// ============ MESS API ============
export const messAPI = {
  get: () => apiCall<{ success: boolean; mess?: Mess }>('/mess'),
  
  update: (data: { name: string }) =>
    apiCall<{ success: boolean; mess?: Mess }>(
      '/mess',
      {
        method: 'PUT',
        body: JSON.stringify(data),
      }
    ),
  
  delete: () => apiCall<{ success: boolean }>('/mess', { method: 'DELETE' }),
  
  getMembers: () => apiCall<{ success: boolean; members?: any[] }>('/mess/members'),
};

// ============ MONTHS API ============
export const monthsAPI = {
  getAll: () => apiCall<{ success: boolean; months?: Month[] }>('/months'),
  
  getActive: () => apiCall<{ success: boolean; month?: Month }>('/months/active'),
  
  create: (data: { name: string; startDate: string }) =>
    apiCall<{ success: boolean; month?: Month }>(
      '/months',
      {
        method: 'POST',
        body: JSON.stringify(data),
      }
    ),
};

// ============ MEALS API ============
export const mealsAPI = {
  getByMonth: (monthId: string) =>
    apiCall<{ success: boolean; meals?: Meal[] }>(`/meals?monthId=${monthId}`),
  
  save: (data: { monthId: string; date: string; meals: any[] }) =>
    apiCall<{ success: boolean; meal?: Meal }>(
      '/meals',
      {
        method: 'POST',
        body: JSON.stringify(data),
      }
    ),
  
  update: (id: string, meals: any[]) =>
    apiCall<{ success: boolean; meal?: Meal }>(
      `/meals/${id}`,
      {
        method: 'PUT',
        body: JSON.stringify({ meals }),
      }
    ),
};

// ============ DEPOSITS API ============
export const depositsAPI = {
  getByMonth: (monthId: string) =>
    apiCall<{ success: boolean; deposits?: Deposit[] }>(`/deposits?monthId=${monthId}`),
  
  create: (data: Partial<Deposit>) =>
    apiCall<{ success: boolean; deposit?: Deposit }>(
      '/deposits',
      {
        method: 'POST',
        body: JSON.stringify(data),
      }
    ),
  
  update: (id: string, data: Partial<Deposit>) =>
    apiCall<{ success: boolean; deposit?: Deposit }>(
      `/deposits/${id}`,
      {
        method: 'PUT',
        body: JSON.stringify(data),
      }
    ),
  
  delete: (id: string) =>
    apiCall<{ success: boolean }>(`/deposits/${id}`, { method: 'DELETE' }),
};

// ============ MEAL COSTS API ============
export const mealCostsAPI = {
  getByMonth: (monthId: string) =>
    apiCall<{ success: boolean; costs?: MealCost[] }>(`/meal-costs?monthId=${monthId}`),
  
  create: (data: Partial<MealCost> & { addAsDeposit?: boolean }) =>
    apiCall<{ success: boolean; cost?: MealCost }>(
      '/meal-costs',
      {
        method: 'POST',
        body: JSON.stringify(data),
      }
    ),
  
  update: (id: string, data: Partial<MealCost>) =>
    apiCall<{ success: boolean; cost?: MealCost }>(
      `/meal-costs/${id}`,
      {
        method: 'PUT',
        body: JSON.stringify(data),
      }
    ),
  
  delete: (id: string) =>
    apiCall<{ success: boolean }>(`/meal-costs/${id}`, { method: 'DELETE' }),
};

// ============ OTHER COSTS API ============
export const otherCostsAPI = {
  getByMonth: (monthId: string) =>
    apiCall<{ success: boolean; costs?: OtherCost[] }>(`/other-costs?monthId=${monthId}`),
  
  create: (data: Partial<OtherCost>) =>
    apiCall<{ success: boolean; cost?: OtherCost }>(
      '/other-costs',
      {
        method: 'POST',
        body: JSON.stringify(data),
      }
    ),
  
  update: (id: string, data: Partial<OtherCost>) =>
    apiCall<{ success: boolean; cost?: OtherCost }>(
      `/other-costs/${id}`,
      {
        method: 'PUT',
        body: JSON.stringify(data),
      }
    ),
  
  delete: (id: string) =>
    apiCall<{ success: boolean }>(`/other-costs/${id}`, { method: 'DELETE' }),
};

// ============ JOIN REQUESTS API ============
export const joinRequestsAPI = {
  getAll: () =>
    apiCall<{ success: boolean; requests?: JoinRequest[] }>('/join-requests'),
  
  create: (messCode: string) =>
    apiCall<{ success: boolean; request?: JoinRequest; error?: string }>(
      '/join-requests',
      {
        method: 'POST',
        body: JSON.stringify({ messCode }),
      }
    ),
  
  approve: (id: string) =>
    apiCall<{ success: boolean; request?: JoinRequest }>(
      `/join-requests/${id}/approve`,
      { method: 'PUT' }
    ),
  
  reject: (id: string) =>
    apiCall<{ success: boolean; request?: JoinRequest }>(
      `/join-requests/${id}/reject`,
      { method: 'PUT' }
    ),
};

// ============ NOTICES API ============
export const noticesAPI = {
  getAll: () =>
    apiCall<{ success: boolean; notices?: Notice[] }>('/notices'),
  
  getActive: () =>
    apiCall<{ success: boolean; notice?: Notice }>('/notices/active'),
  
  create: (data: { title: string; content: string }) =>
    apiCall<{ success: boolean; notice?: Notice }>(
      '/notices',
      {
        method: 'POST',
        body: JSON.stringify(data),
      }
    ),
  
  update: (id: string, data: { title?: string; content?: string }) =>
    apiCall<{ success: boolean; notice?: Notice }>(
      `/notices/${id}`,
      {
        method: 'PUT',
        body: JSON.stringify(data),
      }
    ),
  
  delete: (id: string) =>
    apiCall<{ success: boolean }>(`/notices/${id}`, { method: 'DELETE' }),
};

// ============ BAZAR DATES API ============
export const bazarDatesAPI = {
  getAll: () =>
    apiCall<{ success: boolean; dates?: BazarDate[] }>('/bazar-dates'),
  
  create: (data: { oderId: string; odername: string; dates: string[] }) =>
    apiCall<{ success: boolean; dates?: BazarDate[]; error?: string }>(
      '/bazar-dates',
      {
        method: 'POST',
        body: JSON.stringify(data),
      }
    ),
  
  delete: (id: string) =>
    apiCall<{ success: boolean }>(`/bazar-dates/${id}`, { method: 'DELETE' }),
};

// ============ NOTIFICATIONS API ============
export const notificationsAPI = {
  getAll: () =>
    apiCall<{ success: boolean; notifications?: Notification[] }>('/notifications'),
  
  markAsRead: (id: string) =>
    apiCall<{ success: boolean }>(`/notifications/${id}/read`, { method: 'PUT' }),
  
  markAllAsRead: () =>
    apiCall<{ success: boolean }>('/notifications/read-all', { method: 'PUT' }),
  
  delete: (id: string) =>
    apiCall<{ success: boolean }>(`/notifications/${id}`, { method: 'DELETE' }),
  
  deleteAll: () =>
    apiCall<{ success: boolean }>('/notifications', { method: 'DELETE' }),
};

// ============ NOTES API ============
export const notesAPI = {
  getAll: () =>
    apiCall<{ success: boolean; notes?: Note[] }>('/notes'),
  
  create: (data: { title: string; description: string }) =>
    apiCall<{ success: boolean; note?: Note }>(
      '/notes',
      {
        method: 'POST',
        body: JSON.stringify(data),
      }
    ),
  
  update: (id: string, data: { title?: string; description?: string }) =>
    apiCall<{ success: boolean; note?: Note }>(
      `/notes/${id}`,
      {
        method: 'PUT',
        body: JSON.stringify(data),
      }
    ),
  
  delete: (id: string) =>
    apiCall<{ success: boolean }>(`/notes/${id}`, { method: 'DELETE' }),
};

// ============ MEMBERS API ============
export const membersAPI = {
  remove: (id: string) =>
    apiCall<{ success: boolean }>(`/members/${id}`, { method: 'DELETE' }),
};
