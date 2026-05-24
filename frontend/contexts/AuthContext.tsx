'use client';

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { authApi, User } from '@/lib/auth';
import { storage } from '@/lib/storage';

const DEV_MODE = process.env.NODE_ENV !== 'production';

const DEV_USER: User = {
  id: 'dev-nathan',
  email: 'nathan@dev.local',
  name: 'Nathan',
  emailVerified: true,
  accountType: 'teacher',
};

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (email: string, password: string, name: string, accountType?: 'student' | 'parent' | 'teacher') => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  verifyEmail: (email: string, code: string) => Promise<{ success: boolean; error?: string }>;
  resendCode: (email: string) => Promise<{ success: boolean; error?: string }>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    try {
      const result = await authApi.getMe();
      if (result.success && result.data?.user) {
        const freshUser = result.data.user;
        setUser(freshUser);
        try { storage.setItem('authUser', JSON.stringify(freshUser)); } catch {}
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (DEV_MODE) {
      setUser(DEV_USER);
      setLoading(false);
      return;
    }
    try {
      const stored = storage.getItem('authUser');
      if (stored) setUser(JSON.parse(stored) as User);
    } catch {
      // localStorage unavailable or parse failed — continue without cached user
    }
    const token = authApi.getAccessToken();
    if (token) {
      const timeoutId = setTimeout(() => setLoading(false), 10000);
      refreshUser().finally(() => {
        clearTimeout(timeoutId);
        setLoading(false);
      });
    } else {
      setLoading(false);
    }
  }, [refreshUser]);

  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    const result = await authApi.login(email, password);
    if (result.success && result.data) {
      authApi.setTokens(result.data.accessToken!, result.data.refreshToken!);
      const u = result.data.user || null;
      setUser(u);
      setLoading(false);
      if (u) { try { storage.setItem('authUser', JSON.stringify(u)); } catch {} }
      return { success: true };
    }
    return { success: false, error: result.error || 'Login failed' };
  };

  const register = async (email: string, password: string, name: string, accountType?: 'student' | 'parent' | 'teacher'): Promise<{ success: boolean; error?: string }> => {
    const result = await authApi.register(email, password, name, accountType);
    if (result.success && result.data) {
      authApi.setTokens(result.data.accessToken!, result.data.refreshToken!);
      const u = result.data.user || null;
      setUser(u);
      setLoading(false);
      if (u) { try { storage.setItem('authUser', JSON.stringify(u)); } catch {} }
      return { success: true };
    }
    return { success: false, error: result.error || 'Registration failed' };
  };

  const logout = async (): Promise<void> => {
    await authApi.logout();
    authApi.clearTokens();
    try { storage.removeItem('authUser'); } catch {}
    if (DEV_MODE) {
      setUser(DEV_USER);
    } else {
      setUser(null);
    }
  };

  const verifyEmail = async (email: string, code: string): Promise<{ success: boolean; error?: string }> => {
    const result = await authApi.verifyEmail(email, code);
    if (result.success) {
      await refreshUser();
      return { success: true };
    }
    return { success: false, error: result.error || 'Verification failed' };
  };

  const resendCode = async (email: string): Promise<{ success: boolean; error?: string }> => {
    const result = await authApi.resendCode(email);
    if (result.success) return { success: true };
    return { success: false, error: result.error || 'Failed to resend code' };
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, verifyEmail, resendCode, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}
