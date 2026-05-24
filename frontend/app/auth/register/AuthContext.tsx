'use client';

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { authApi, User } from '@/lib/auth';

const DEV_MODE = process.env.NODE_ENV !== 'production';

const DEV_USER: User = {
  id: 'dev-nathan',
  email: 'nathan@dev.local',
  name: 'Nathan',
  emailVerified: true,
};

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (email: string, password: string, name: string, accountType?: 'student' | 'parent') => Promise<{ success: boolean; error?: string }>;
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
  const [user, setUser] = useState<User | null>(DEV_MODE ? DEV_USER : null);
  const [loading, setLoading] = useState(false);

  const refreshUser = useCallback(async () => {
    const result = await authApi.getMe();
    if (result.success && result.data?.user) {
      setUser(result.data.user);
    } else {
      setUser(null);
    }
  }, []);

  useEffect(() => {
    if (DEV_MODE) return;
    const token = authApi.getAccessToken();
    if (token) {
      refreshUser();
    }
  }, [refreshUser]);

  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    const result = await authApi.login(email, password);
    if (result.success && result.data) {
      authApi.setTokens(result.data.accessToken!, result.data.refreshToken!);
      setUser(result.data.user || null);
      return { success: true };
    }
    return { success: false, error: result.error || 'Login failed' };
  };

  const register = async (email: string, password: string, name: string, accountType?: 'student' | 'parent'): Promise<{ success: boolean; error?: string }> => {
    const result = await authApi.register(email, password, name, accountType);
    if (result.success && result.data) {
      authApi.setTokens(result.data.accessToken!, result.data.refreshToken!);
      setUser(result.data.user || null);
      return { success: true };
    }
    return { success: false, error: result.error || 'Registration failed' };
  };

  const logout = async (): Promise<void> => {
    await authApi.logout();
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
