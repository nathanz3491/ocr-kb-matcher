import { authApi } from './auth';

const FETCH_TIMEOUT = 10000; // 10 second timeout for all data fetches

async function fetchWithTimeout(url: string, options: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(timeout);
    return res;
  } catch (err) {
    clearTimeout(timeout);
    if (err instanceof Error && err.name === 'AbortError') {
      // Return a fake 504 response so callers can handle it
      return new Response(JSON.stringify({ success: false, error: 'Request timed out' }), {
        status: 504,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    throw err;
  }
}

export const api = {
  get: async (path: string): Promise<Response> => {
    const token = authApi.getAccessToken();
    return fetchWithTimeout(path.startsWith('/') ? path : `/api/${path}`, {
      headers: {
        'Authorization': token ? `Bearer ${token}` : '',
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    });
  },

  post: async (path: string, body: unknown, extraHeaders?: Record<string, string>): Promise<Response> => {
    const token = authApi.getAccessToken();
    const isFormData = body instanceof FormData;
    const headers: Record<string, string> = {};
    if (!isFormData) headers['Content-Type'] = 'application/json';
    if (isFormData) headers['Content-Type'] = 'multipart/form-data';
    if (token) headers['Authorization'] = `Bearer ${token}`;
    if (extraHeaders) Object.assign(headers, extraHeaders);
    return fetchWithTimeout(path.startsWith('/') ? path : `/api/${path}`, {
      method: 'POST',
      headers,
      body: isFormData ? body : JSON.stringify(body),
      credentials: 'include',
    });
  },

  put: async (path: string, body: unknown): Promise<Response> => {
    const token = authApi.getAccessToken();
    return fetchWithTimeout(path.startsWith('/') ? path : `/api/${path}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : '',
      },
      body: JSON.stringify(body),
      credentials: 'include',
    });
  },

  delete: async (path: string): Promise<Response> => {
    const token = authApi.getAccessToken();
    return fetchWithTimeout(path.startsWith('/') ? path : `/api/${path}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : '',
      },
      credentials: 'include',
    });
  },

  patch: async (path: string, body: unknown): Promise<Response> => {
    const token = authApi.getAccessToken();
    return fetchWithTimeout(path.startsWith('/') ? path : `/api/${path}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : '',
      },
      body: JSON.stringify(body),
      credentials: 'include',
    });
  },
};
