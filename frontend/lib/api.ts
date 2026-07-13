import { authApi } from './auth';

const API = process.env.NEXT_PUBLIC_API_BASE_URL;

/**
 * Dispatch a custom event when a 429 QUOTA_EXCEEDED response is detected.
 * Components can listen for 'app:quota-exceeded' to show an upgrade toast.
 */
function dispatchQuotaExceeded(detail: Record<string, unknown>) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(
    new CustomEvent('app:quota-exceeded', { detail })
  );
}

/**
 * Check a Response for 429 + QUOTA_EXCEEDED and dispatch event.
 * Returns the original response unconsumed so callers can still use it.
 */
async function checkQuotaExceeded(response: Response): Promise<void> {
  if (response.status !== 429) return;
  try {
    const body: Record<string, unknown> = await response.clone().json();
    if (body?.error === 'QUOTA_EXCEEDED') {
      dispatchQuotaExceeded(body);
    }
  } catch {
    // Response body is not JSON or unparseable — skip silently
  }
}

export const api = {
  get: async (path: string): Promise<Response> => {
    const token = authApi.getAccessToken();
    const res = await fetch(`${API}${path}`, {
      headers: {
        'Authorization': token ? `Bearer ${token}` : '',
        'Content-Type': 'application/json',
      },
    });
    checkQuotaExceeded(res);
    return res;
  },

  post: async (path: string, body: unknown): Promise<Response> => {
    const token = authApi.getAccessToken();
    const res = await fetch(`${API}${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : '',
      },
      body: JSON.stringify(body),
    });
    checkQuotaExceeded(res);
    return res;
  },

  put: async (path: string, body: unknown): Promise<Response> => {
    const token = authApi.getAccessToken();
    const res = await fetch(`${API}${path}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : '',
      },
      body: JSON.stringify(body),
    });
    checkQuotaExceeded(res);
    return res;
  },

  delete: async (path: string): Promise<Response> => {
    const token = authApi.getAccessToken();
    const res = await fetch(`${API}${path}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : '',
      },
    });
    checkQuotaExceeded(res);
    return res;
  },

  patch: async (path: string, body: unknown): Promise<Response> => {
    const token = authApi.getAccessToken();
    const res = await fetch(`${API}${path}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : '',
      },
      body: JSON.stringify(body),
    });
    checkQuotaExceeded(res);
    return res;
  },
};
