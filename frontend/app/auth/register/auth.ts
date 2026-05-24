const API = process.env.NEXT_PUBLIC_API_BASE_URL;

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
  accountType?: 'student' | 'parent';
}

export const authApi = {
  register: async (email: string, password: string, name: string, accountType?: 'student' | 'parent'): Promise<AuthResponse> => {
    const res = await fetch(`${API}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, name, accountType }),
    });
    return res.json();
  },

  login: async (email: string, password: string): Promise<AuthResponse> => {
    const res = await fetch(`${API}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    return res.json();
  },

  verifyEmail: async (email: string, code: string): Promise<AuthResponse> => {
    const res = await fetch(`${API}/api/auth/verify-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, code }),
    });
    return res.json();
  },

  resendCode: async (email: string): Promise<AuthResponse> => {
    const res = await fetch(`${API}/api/auth/resend-code`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    return res.json();
  },

  logout: async (): Promise<AuthResponse> => {
    const token = authApi.getAccessToken();
    const res = await fetch(`${API}/api/auth/logout`, {
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
    const res = await fetch(`${API}/api/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });
    return res.json();
  },

  getMe: async (): Promise<AuthResponse> => {
    const token = authApi.getAccessToken();
    if (!token) return { success: false, error: 'No token' };
    const res = await fetch(`${API}/api/auth/me`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    return res.json();
  },

  getAccessToken: (): string | null => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('accessToken');
  },

  setTokens: (accessToken: string, refreshToken: string): void => {
    if (typeof window === 'undefined') return;
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
  },

  clearTokens: (): void => {
    if (typeof window === 'undefined') return;
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
  },
};

// Parent Monitoring API
export const parentMonitorApi = {
  getStudents: async (): Promise<{ success: boolean; data?: Array<{ id: string; name: string; email: string }>; error?: string }> => {
    const token = authApi.getAccessToken();
    const res = await fetch(`${API}/api/auth/students`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    return res.json();
  },

  generateCode: async (parentId?: string, parentName?: string, parentEmail?: string): Promise<{ success: boolean; data?: { code: string; expiresAt: number }; error?: string }> => {
    const token = authApi.getAccessToken();
    const res = await fetch(`${API}/api/auth/students/generate-code`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ parentId, parentName, parentEmail }),
    });
    return res.json();
  },

  getCodeStatus: async (studentId: string): Promise<{ success: boolean; data?: { hasPendingCode: boolean; codeExpires?: number }; error?: string }> => {
    const token = authApi.getAccessToken();
    const res = await fetch(`${API}/api/auth/students/${studentId}/code-status`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    return res.json();
  },

  verifyCode: async (studentId: string, code: string): Promise<{ success: boolean; data?: { link: any }; error?: string }> => {
    const token = authApi.getAccessToken();
    const res = await fetch(`${API}/api/auth/verify-parent-code`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ studentId, code }),
    });
    return res.json();
  },

  getLinkedStudents: async (): Promise<{ success: boolean; data?: Array<{ linkId: string; studentId: string; studentName: string; studentEmail: string; linkedAt: string }>; error?: string }> => {
    const token = authApi.getAccessToken();
    const res = await fetch(`${API}/api/parent-monitor/students`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    return res.json();
  },

  getStudentOverview: async (studentId: string): Promise<{ success: boolean; data?: any; error?: string }> => {
    const token = authApi.getAccessToken();
    const res = await fetch(`${API}/api/parent-monitor/student/${studentId}/overview`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    return res.json();
  },

  getStudentKnowledgeGraph: async (studentId: string): Promise<{ success: boolean; data?: any; error?: string }> => {
    const token = authApi.getAccessToken();
    const res = await fetch(`${API}/api/parent-monitor/student/${studentId}/knowledge-graph`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    return res.json();
  },

  getStudentReviews: async (studentId: string): Promise<{ success: boolean; data?: any; error?: string }> => {
    const token = authApi.getAccessToken();
    const res = await fetch(`${API}/api/parent-monitor/student/${studentId}/reviews`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    return res.json();
  },

  getStudentQuiz: async (studentId: string): Promise<{ success: boolean; data?: any; error?: string }> => {
    const token = authApi.getAccessToken();
    const res = await fetch(`${API}/api/parent-monitor/student/${studentId}/quiz`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    return res.json();
  },

  revokeLink: async (linkId: string): Promise<{ success: boolean; error?: string }> => {
    const token = authApi.getAccessToken();
    const res = await fetch(`${API}/api/parent-monitor/link/${linkId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` },
    });
    return res.json();
  },
};
