import { setAuthTokenGetter } from '@workspace/api-client-react';

export const ADMIN_TOKEN_KEY = 'lopezx_admin_token';

const base = import.meta.env.BASE_URL.endsWith('/')
  ? import.meta.env.BASE_URL
  : `${import.meta.env.BASE_URL}/`;

export function getAdminToken(): string | null {
  try {
    return localStorage.getItem(ADMIN_TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setAdminToken(token: string): void {
  localStorage.setItem(ADMIN_TOKEN_KEY, token);
  setAuthTokenGetter(() => getAdminToken());
}

export function clearAdminToken(): void {
  localStorage.removeItem(ADMIN_TOKEN_KEY);
  setAuthTokenGetter(null);
}

export async function adminLogin(username: string, password: string): Promise<void> {
  const response = await fetch(`${base}api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  const data = (await response.json().catch(() => ({}))) as { token?: string; error?: string };
  if (!response.ok || !data.token) {
    throw new Error(data.error || 'Login failed');
  }
  setAdminToken(data.token);
}

export async function adminMe(): Promise<boolean> {
  const token = getAdminToken();
  if (!token) return false;
  const response = await fetch(`${base}api/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.ok;
}

export function initAdminAuth(): void {
  // Attach the stored admin token to every generated API request.
  setAuthTokenGetter(() => getAdminToken());
  if (!getAdminToken()) setAuthTokenGetter(null);
}