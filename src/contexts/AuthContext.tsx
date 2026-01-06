import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User } from '@/types';
import { 
  getCurrentUser, 
  setCurrentUser as saveCurrentUser,
  getUserByEmail,
  createUser,
  updateUser,
  createMess,
  createMonth,
  getMessById,
} from '@/lib/storage';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  registerManager: (data: ManagerRegistrationData) => Promise<{ success: boolean; error?: string }>;
  registerMember: (data: MemberRegistrationData) => Promise<{ success: boolean; error?: string; userId?: string }>;
  logout: () => void;
  refreshUser: () => void;
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

  useEffect(() => {
    const savedUser = getCurrentUser();
    if (savedUser) {
      setUser(savedUser);
    }
    setIsLoading(false);
  }, []);

  const refreshUser = () => {
    if (user) {
      const updatedUser = getUserByEmail(user.email);
      if (updatedUser) {
        setUser(updatedUser);
        saveCurrentUser(updatedUser);
      }
    }
  };

  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
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

    // For managers, just log them in
    if (existingUser.role === 'manager') {
      setUser(existingUser);
      saveCurrentUser(existingUser);
      return { success: true };
    }

    // For members, check various states
    // Note: We allow login even if not approved, the routing will handle redirection
    setUser(existingUser);
    saveCurrentUser(existingUser);
    return { success: true };
  };

  const registerManager = async (data: ManagerRegistrationData): Promise<{ success: boolean; error?: string }> => {
    const existingUser = getUserByEmail(data.email);
    
    if (existingUser) {
      return { success: false, error: 'Email already registered.' };
    }

    // Create the mess first
    const mess = createMess({
      name: data.messName,
      managerId: '', // Will update after creating user
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

    // Create the member user (not approved by default, no mess assigned yet)
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
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, registerManager, registerMember, logout, refreshUser }}>
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
