/**
 * Robust storage utility with cookie fallback for Safari/private browsing.
 * Tries: localStorage → sessionStorage → cookie
 */
function isStorageAvailable(storage: Storage | null): boolean {
  if (!storage || typeof window === 'undefined') return false;
  try {
    const key = '__storage_test__';
    storage.setItem(key, '1');
    storage.removeItem(key);
    return true;
  } catch {
    return false;
  }
}

function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp('(?:^|; )' + name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '=([^;]*)'));
  return match ? decodeURIComponent(match[1]) : null;
}

function setCookie(name: string, value: string, days = 7): void {
  if (typeof document === 'undefined') return;
  const expires = new Date(Date.now() + days * 864e5).toUTCString();
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax`;
}

function deleteCookie(name: string): void {
  if (typeof document === 'undefined') return;
  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
}

const _localStorage = typeof window !== 'undefined' && isStorageAvailable(window.localStorage) ? window.localStorage : null;
const _sessionStorage = typeof window !== 'undefined' && isStorageAvailable(window.sessionStorage) ? window.sessionStorage : null;

export const storage = {
  getItem(key: string): string | null {
    if (_localStorage) {
      try { return _localStorage.getItem(key); } catch { /* fall through */ }
    }
    if (_sessionStorage) {
      try { return _sessionStorage.getItem(key); } catch { /* fall through */ }
    }
    return getCookie(`s_${key}`);
  },

  setItem(key: string, value: string): void {
    if (_localStorage) {
      try { _localStorage.setItem(key, value); return; } catch { /* fall through */ }
    }
    if (_sessionStorage) {
      try { _sessionStorage.setItem(key, value); return; } catch { /* fall through */ }
    }
    setCookie(`s_${key}`, value);
  },

  removeItem(key: string): void {
    if (_localStorage) {
      try { _localStorage.removeItem(key); } catch { /* ignore */ }
    }
    if (_sessionStorage) {
      try { _sessionStorage.removeItem(key); } catch { /* ignore */ }
    }
    deleteCookie(`s_${key}`);
  },
};
