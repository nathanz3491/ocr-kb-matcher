import { storage } from './storage';

export interface AuthResponse {
  success: boolean;
  data?: {
    user?: User;
    accessToken?: string;
    refreshToken?: string;
  };
  error?: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  emailVerified: boolean;
  accountType?: 'student' | 'parent' | 'teacher';
  parentCode?: string | null;
  parentCodeExpires?: number | null;
}

export const authApi = {
  register: async (email: string, password: string, name: string, accountType?: 'student' | 'parent' | 'teacher'): Promise<AuthResponse> => {
    const res = await fetch(`/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, name, accountType }),
    });
    return res.json();
  },

  login: async (email: string, password: string): Promise<AuthResponse> => {
    const res = await fetch(`/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    return res.json();
  },

  verifyEmail: async (email: string, code: string): Promise<AuthResponse> => {
    const res = await fetch(`/api/auth/verify-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, code }),
    });
    return res.json();
  },

  resendCode: async (email: string): Promise<AuthResponse> => {
    const res = await fetch(`/api/auth/resend-code`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    return res.json();
  },

  logout: async (): Promise<AuthResponse> => {
    const token = authApi.getAccessToken();
    const res = await fetch(`/api/auth/logout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });
    authApi.clearTokens();
    return res.json();
  },

  refresh: async (refreshToken: string): Promise<AuthResponse> => {
    const res = await fetch(`/api/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });
    return res.json();
  },

  getMe: async (): Promise<AuthResponse> => {
    const token = authApi.getAccessToken();
    if (!token) return { success: false, error: 'No token' };
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);
    try {
      const res = await fetch(`/api/auth/me`, {
        headers: { 'Authorization': `Bearer ${token}` },
        signal: controller.signal,
      });
      clearTimeout(timeout);
      const contentType = res.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        return { success: false, error: 'Non-JSON response from server' };
      }
      try {
        return await res.json();
      } catch {
        return { success: false, error: 'Failed to parse server response' };
      }
    } catch (err) {
      clearTimeout(timeout);
      if (err instanceof Error && err.name === 'AbortError') {
        return { success: false, error: 'Request timed out' };
      }
      return { success: false, error: 'Request failed' };
    }
  },

  getAccessToken: (): string | null => {
    if (typeof window === 'undefined') return null;
    return storage.getItem('accessToken');
  },

  setTokens: (accessToken: string, refreshToken: string): void => {
    if (typeof window === 'undefined') return;
    storage.setItem('accessToken', accessToken);
    storage.setItem('refreshToken', refreshToken);
  },

  clearTokens: (): void => {
    if (typeof window === 'undefined') return;
    storage.removeItem('accessToken');
    storage.removeItem('refreshToken');
  },
};

// Teacher API
export const teacherApi = {
  getLinkedStudents: async (): Promise<{
    success: boolean;
    data?: Array<{
      linkId: string;
      studentId: string;
      studentName: string;
      studentEmail: string;
      linkedAt: string;
    }>;
    error?: string;
  }> => {
    const token = authApi.getAccessToken();
    const res = await fetch(`/api/teacher/students`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return res.json();
  },

  verifyTeacherCode: async (studentId: string, code: string): Promise<{
    success: boolean;
    data?: { link: any };
    error?: string;
  }> => {
    const token = authApi.getAccessToken();
    const res = await fetch(`/api/teacher/verify-student-code`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ studentId, code }),
    });
    return res.json();
  },

  revokeLink: async (linkId: string): Promise<{ success: boolean; error?: string }> => {
    const token = authApi.getAccessToken();
    const res = await fetch(`/api/teacher/link/${linkId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    return res.json();
  },

  getStudentOverview: async (studentId: string): Promise<{ success: boolean; data?: any; error?: string }> => {
    const token = authApi.getAccessToken();
    const res = await fetch(`/api/teacher-monitor/student/${studentId}/overview`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return res.json();
  },

  getTeacherGameHistory: async (): Promise<{ success: boolean; data?: any[]; error?: string }> => {
    const token = authApi.getAccessToken();
    const res = await fetch(`/api/teacher/games/history`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return res.json();
  },

  getTeacherGameResults: async (gameId: string): Promise<{ success: boolean; data?: any; error?: string }> => {
    const token = authApi.getAccessToken();
    const res = await fetch(`/api/teacher/games/${gameId}/results`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return res.json();
  },
};

// Parent Monitoring API
export const parentMonitorApi = {
  getStudents: async (): Promise<{ success: boolean; data?: Array<{ id: string; name: string; email: string }>; error?: string }> => {
    const token = authApi.getAccessToken();
    const res = await fetch(`/api/auth/students`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    return res.json();
  },

  generateCode: async (parentId?: string, parentName?: string, parentEmail?: string): Promise<{ success: boolean; data?: { code: string; expiresAt: number }; error?: string }> => {
    const token = authApi.getAccessToken();
    const res = await fetch(`/api/auth/students/generate-code`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ parentId, parentName, parentEmail }),
    });
    return res.json();
  },

  getCodeStatus: async (studentId: string): Promise<{ success: boolean; data?: { hasPendingCode: boolean; codeExpires?: number }; error?: string }> => {
    const token = authApi.getAccessToken();
    const res = await fetch(`/api/auth/students/${studentId}/code-status`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    return res.json();
  },

  verifyCode: async (studentId: string, code: string): Promise<{ success: boolean; data?: { link: any }; error?: string }> => {
    const token = authApi.getAccessToken();
    const res = await fetch(`/api/auth/verify-parent-code`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ studentId, code }),
    });
    return res.json();
  },

  getLinkedStudents: async (): Promise<{ success: boolean; data?: Array<{ linkId: string; studentId: string; studentName: string; studentEmail: string; linkedAt: string }>; error?: string }> => {
    const token = authApi.getAccessToken();
    const res = await fetch(`/api/parent-monitor/students`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    return res.json();
  },

  getStudentOverview: async (studentId: string): Promise<{ success: boolean; data?: any; error?: string }> => {
    const token = authApi.getAccessToken();
    const res = await fetch(`/api/parent-monitor/student/${studentId}/overview`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    return res.json();
  },

  getStudentKnowledgeGraph: async (studentId: string): Promise<{ success: boolean; data?: any; error?: string }> => {
    const token = authApi.getAccessToken();
    const res = await fetch(`/api/parent-monitor/student/${studentId}/knowledge-graph`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    return res.json();
  },

  getStudentReviews: async (studentId: string): Promise<{ success: boolean; data?: any; error?: string }> => {
    const token = authApi.getAccessToken();
    const res = await fetch(`/api/parent-monitor/student/${studentId}/reviews`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    return res.json();
  },

  getStudentQuiz: async (studentId: string): Promise<{ success: boolean; data?: any; error?: string }> => {
    const token = authApi.getAccessToken();
    const res = await fetch(`/api/parent-monitor/student/${studentId}/quiz`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    return res.json();
  },

  revokeLink: async (linkId: string): Promise<{ success: boolean; error?: string }> => {
    const token = authApi.getAccessToken();
    const res = await fetch(`/api/parent-monitor/link/${linkId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` },
    });
    return res.json();
  },

  getMyParentLinks: async (): Promise<{ success: boolean; data?: Array<{ linkId: string; parentId: string; parentName: string; parentEmail: string; linkedAt: string }>; error?: string }> => {
    const token = authApi.getAccessToken();
    const res = await fetch(`/api/auth/my-parent-links`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    return res.json();
  },

  unlinkParent: async (linkId: string): Promise<{ success: boolean; error?: string }> => {
    const token = authApi.getAccessToken();
    const res = await fetch(`/api/auth/my-parent-links/${linkId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` },
    });
    return res.json();
  },
};

// Teacher Link API
export const teacherLinkApi = {
  generateTeacherCode: async (): Promise<{ success: boolean; data?: { code: string; expiresAt: number }; error?: string }> => {
    const token = authApi.getAccessToken();
    const res = await fetch(`/api/teacher/students/generate-code`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    });
    return res.json();
  },

  getMyTeacherLinks: async (): Promise<{ success: boolean; data?: Array<{ linkId: string; teacherId: string; teacherName: string; teacherEmail: string; linkedAt: string }>; error?: string }> => {
    const token = authApi.getAccessToken();
    const res = await fetch(`/api/teacher/my-teacher-links`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    return res.json();
  },

  unlinkTeacher: async (linkId: string): Promise<{ success: boolean; error?: string }> => {
    const token = authApi.getAccessToken();
    const res = await fetch(`/api/teacher/link/${linkId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` },
    });
    return res.json();
  },
};
