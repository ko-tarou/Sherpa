const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
const KEY_STORAGE = 'admin_api_key';

export function getStoredKey(): string | null {
  return sessionStorage.getItem(KEY_STORAGE);
}

export function setStoredKey(key: string): void {
  sessionStorage.setItem(KEY_STORAGE, key);
}

export function clearStoredKey(): void {
  sessionStorage.removeItem(KEY_STORAGE);
}

async function fetchAdmin<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const key = getStoredKey();
  if (!key) throw new Error('No admin key');

  const res = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'X-Admin-Key': key,
      ...options?.headers,
    },
  });

  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error || res.statusText);
  return body as T;
}

export const adminApi = {
  async getEvents(): Promise<{ events: import('../types').AdminEventRow[] }> {
    return fetchAdmin('/api/admin/events');
  },

  async runBatch(): Promise<{ ok: boolean; channels_deleted: number; events_deleted: number }> {
    return fetchAdmin('/api/admin/batch/run', { method: 'POST' });
  },
};
