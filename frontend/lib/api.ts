import { authApi } from './auth';

export const api = {
  get: async (path: string): Promise<Response> => {
    const token = authApi.getAccessToken();
    return fetch(path.startsWith('/') ? path : `/api/${path}`, {
      headers: {
        'Authorization': token ? `Bearer ${token}` : '',
        'Content-Type': 'application/json',
      },
    });
  },

  post: async (path: string, body: unknown): Promise<Response> => {
    const token = authApi.getAccessToken();
    return fetch(path.startsWith('/') ? path : `/api/${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : '',
      },
      body: JSON.stringify(body),
    });
  },

  put: async (path: string, body: unknown): Promise<Response> => {
    const token = authApi.getAccessToken();
    return fetch(path.startsWith('/') ? path : `/api/${path}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : '',
      },
      body: JSON.stringify(body),
    });
  },

  delete: async (path: string): Promise<Response> => {
    const token = authApi.getAccessToken();
    return fetch(path.startsWith('/') ? path : `/api/${path}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : '',
      },
    });
  },

  patch: async (path: string, body: unknown): Promise<Response> => {
    const token = authApi.getAccessToken();
    return fetch(path.startsWith('/') ? path : `/api/${path}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : '',
      },
      body: JSON.stringify(body),
    });
  },
};
