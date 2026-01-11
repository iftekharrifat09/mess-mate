import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User } from '@/types';
import { 
  getCurrentUser, 
  setCurrentUser as saveCurrentUser,
  getUserByEmail,
  createUser,
  createMess,
  createMonth,
  getMessById,
} from '@/lib/storage';
import { 
  loginAPI, 
  registerManagerAPI, 
  registerMemberAPI,
  getCurrentUserAPI,
  removeToken,
  getToken,
  checkMongoDbStatus,
} from '@/lib/api';
import { USE_BACKEND, isMongoDbConnected, setMongoDbConnected } from '@/lib/config';
import { toast } from '@/hooks/use-toast';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isBackendConnected: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string; user?: User }>;
  registerManager: (data: ManagerRegistrationData) => Promise<{ success: boolean; error?: string }>;
  registerMember: (data: MemberRegistrationData) => Promise<{ success: boolean; error?: string; userId?: string }>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

interface ManagerRegistrationData {
  fullName: string;
  messName: string;
  phone: string;
  email: string;
  password: string;
}

interface MemberRegistrationData {
  fullName: string;
  phone: string;
  email: string;
  password: string;
  messId: string;
}

// Simple password storage (in production, use proper hashing)
const PASSWORDS_KEY = 'mess_manager_passwords';

function getPasswords(): Record<string, string> {
  const data = localStorage.getItem(PASSWORDS_KEY);
  return data ? JSON.parse(data) : {};
}

function savePassword(email: string, password: string): void {
  const passwords = getPasswords();
  passwords[email.toLowerCase()] = password;
  localStorage.setItem(PASSWORDS_KEY, JSON.stringify(passwords));
}

function verifyPassword(email: string, password: string): boolean {
  const passwords = getPasswords();
  return passwords[email.toLowerCase()] === password;
}

export function updatePassword(email: string, newPassword: string): void {
  savePassword(email, newPassword);
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isBackendConnected, setIsBackendConnected] = useState(false);

  useEffect(() => {
    const initAuth = async () => {
      // Check backend connection status
      if (USE_BACKEND) {
        const connected = await checkMongoDbStatus();
        setIsBackendConnected(connected);
        
        if (connected && getToken()) {
          // Try to get user from backend
          try {
            const result = await getCurrentUserAPI();
            if (result.success && result.data) {
              const apiUser = (result.data as any).user;
              const localUser: User = {
                id: apiUser.id,
                email: apiUser.email,
                fullName: apiUser.fullName || apiUser.name,
                phone: apiUser.phone || apiUser.phoneNumber || '',
                role: apiUser.role,
                messId: apiUser.messId || '',
                isApproved: apiUser.isApproved !== false,
                isActive: apiUser.isActive !== false,
                emailVerified: apiUser.emailVerified || false,
                createdAt: new Date().toISOString(),
              };
              setUser(localUser);
              saveCurrentUser(localUser);
              setIsLoading(false);
              return;
            }
          } catch (error) {
            console.error('Failed to get user from backend:', error);
          }
        }
      }

      // Fallback to localStorage
      const savedUser = getCurrentUser();
      if (savedUser) {
        setUser(savedUser);
      }
      setIsLoading(false);
    };

    initAuth();
  }, []);

  const refreshUser = async (): Promise<void> => {
    if (USE_BACKEND && isMongoDbConnected() && getToken()) {
      try {
        const result = await getCurrentUserAPI();
        if (result.success && result.data) {
          const apiUser = (result.data as any).user;
          const localUser: User = {
            id: apiUser.id,
            email: apiUser.email,
            fullName: apiUser.fullName || apiUser.name,
            phone: apiUser.phone || apiUser.phoneNumber || '',
            role: apiUser.role,
            messId: apiUser.messId || '',
            isApproved: apiUser.isApproved !== false,
            isActive: apiUser.isActive !== false,
            emailVerified: apiUser.emailVerified || false,
            createdAt: new Date().toISOString(),
          };
          setUser(localUser);
          saveCurrentUser(localUser);
          return;
        }
      } catch (error) {
        console.error('Failed to refresh user from backend:', error);
      }
    }

    // Fallback to localStorage - reload the user by ID or email
    if (user) {
      // Get fresh user data from storage by ID
      const allUsers = JSON.parse(localStorage.getItem('mess_manager_users') || '[]');
      const updatedUser = allUsers.find((u: User) => u.id === user.id) as User | undefined;
      
      if (updatedUser) {
        setUser(updatedUser);
        saveCurrentUser(updatedUser);
      } else {
        // Try by email as fallback
        const byEmail = getUserByEmail(user.email);
        if (byEmail) {
          setUser(byEmail);
          saveCurrentUser(byEmail);
        }
      }
    }
  };

  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string; user?: User }> => {
    // Try backend first if enabled
    if (USE_BACKEND) {
      const result = await loginAPI(email, password);
      
      if (result.success && result.user) {
        const apiUser = result.user as any;
        const localUser: User = {
          id: apiUser.id,
          email: apiUser.email,
          fullName: apiUser.fullName || apiUser.name,
          phone: apiUser.phone || apiUser.phoneNumber || '',
          role: apiUser.role,
          messId: apiUser.messId || '',
          isApproved: apiUser.isApproved !== false,
          isActive: apiUser.isActive !== false,
          emailVerified: apiUser.emailVerified || false,
          createdAt: new Date().toISOString(),
        };
        setUser(localUser);
        saveCurrentUser(localUser);
        setIsBackendConnected(true);
        return { success: true, user: localUser };
      }

      // If USE_LOCAL_STORAGE error, fall through to localStorage
      if (result.error !== 'USE_LOCAL_STORAGE') {
        return { success: false, error: result.error };
      }
      
      // Show fallback alert
      toast({
        title: "MongoDB not connected",
        description: "Using Local Storage for authentication",
        variant: "default",
      });
    }

    // Fallback to localStorage
    const existingUser = getUserByEmail(email);
    
    if (!existingUser) {
      return { success: false, error: 'User not found. Please register first.' };
    }

    if (!verifyPassword(email, password)) {
      return { success: false, error: 'Invalid password.' };
    }

    if (!existingUser.isActive) {
      return { success: false, error: 'Your account has been deactivated.' };
    }

    setUser(existingUser);
    saveCurrentUser(existingUser);
    return { success: true, user: existingUser };
  };

  const registerManager = async (data: ManagerRegistrationData): Promise<{ success: boolean; error?: string }> => {
    // Try backend first if enabled
    if (USE_BACKEND) {
      const result = await registerManagerAPI({
        name: data.fullName,
        email: data.email,
        password: data.password,
        messName: data.messName,
      });
      
      if (result.success && result.user) {
        const apiUser = result.user as any;
        const localUser: User = {
          id: apiUser.id,
          email: apiUser.email,
          fullName: apiUser.fullName || apiUser.name,
          phone: apiUser.phone || apiUser.phoneNumber || data.phone || '',
          role: apiUser.role,
          messId: apiUser.messId || '',
          isApproved: apiUser.isApproved !== false,
          isActive: apiUser.isActive !== false,
          emailVerified: apiUser.emailVerified || false,
          createdAt: new Date().toISOString(),
        };
        setUser(localUser);
        saveCurrentUser(localUser);
        setIsBackendConnected(true);
        return { success: true };
      }

      // If USE_LOCAL_STORAGE error, fall through to localStorage
      if (result.error !== 'USE_LOCAL_STORAGE') {
        return { success: false, error: result.error };
      }
      
      // Show fallback alert
      toast({
        title: "MongoDB not connected",
        description: "Saving data to Local Storage",
        variant: "default",
      });
    }

    // Fallback to localStorage
    const existingUser = getUserByEmail(data.email);
    
    if (existingUser) {
      return { success: false, error: 'Email already registered.' };
    }

    // Create the mess first
    const mess = createMess({
      name: data.messName,
      managerId: '',
    });

    // Create the manager user
    const newUser = createUser({
      email: data.email,
      fullName: data.fullName,
      phone: data.phone,
      role: 'manager',
      messId: mess.id,
      isApproved: true,
      isActive: true,
      emailVerified: false,
    });

    // Update mess with manager ID
    const messes = JSON.parse(localStorage.getItem('mess_manager_messes') || '[]');
    const messIndex = messes.findIndex((m: any) => m.id === mess.id);
    if (messIndex !== -1) {
      messes[messIndex].managerId = newUser.id;
      localStorage.setItem('mess_manager_messes', JSON.stringify(messes));
    }

    // Create initial month
    const now = new Date();
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                        'July', 'August', 'September', 'October', 'November', 'December'];
    createMonth({
      messId: mess.id,
      name: `${monthNames[now.getMonth()]} ${now.getFullYear()}`,
      year: now.getFullYear(),
      month: now.getMonth() + 1,
      isActive: true,
    });

    // Save password
    savePassword(data.email, data.password);

    setUser(newUser);
    saveCurrentUser(newUser);
    return { success: true };
  };

  const registerMember = async (data: MemberRegistrationData): Promise<{ success: boolean; error?: string; userId?: string }> => {
    // Try backend first if enabled
    if (USE_BACKEND) {
      const result = await registerMemberAPI({
        name: data.fullName,
        email: data.email,
        password: data.password,
      });
      
      if (result.success && result.user) {
        setIsBackendConnected(true);
        return { success: true, userId: result.user.id };
      }

      // If USE_LOCAL_STORAGE error, fall through to localStorage
      if (result.error !== 'USE_LOCAL_STORAGE') {
        return { success: false, error: result.error };
      }
      
      // Show fallback alert
      toast({
        title: "MongoDB not connected",
        description: "Saving data to Local Storage",
        variant: "default",
      });
    }

    // Fallback to localStorage
    const existingUser = getUserByEmail(data.email);
    
    if (existingUser) {
      return { success: false, error: 'Email already registered.' };
    }

    // If messId is provided, validate it
    if (data.messId) {
      const mess = getMessById(data.messId);
      if (!mess) {
        return { success: false, error: 'Invalid mess ID.' };
      }
    }

    // Create the member user
    const newUser = createUser({
      email: data.email,
      fullName: data.fullName,
      phone: data.phone,
      role: 'member',
      messId: data.messId || '',
      isApproved: false,
      isActive: true,
      emailVerified: false,
    });

    // Save password
    savePassword(data.email, data.password);

    return { success: true, userId: newUser.id };
  };

  const logout = () => {
    setUser(null);
    saveCurrentUser(null);
    removeToken();
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, isBackendConnected, login, registerManager, registerMember, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
