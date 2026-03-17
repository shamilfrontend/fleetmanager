import { describe, it, expect, vi, beforeEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useAuthStore } from './auth';

const mockAuthApi = vi.hoisted(() => ({
  login: vi.fn(),
  logout: vi.fn(),
  getMe: vi.fn(),
}));

vi.mock('@/api/auth', () => ({ authApi: mockAuthApi }));

describe('useAuthStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('starts unauthenticated when no token in localStorage', () => {
    const store = useAuthStore();
    expect(store.isAuthenticated).toBe(false);
    expect(store.user).toBeNull();
  });

  it('login sets user and token', async () => {
    const store = useAuthStore();
    const user = { _id: '1', email: 'a@b.ru', role: 'driver' as const, created_at: '', updated_at: '' };
    mockAuthApi.login.mockResolvedValue({
      token: 'access',
      refreshToken: 'refresh',
      user,
    });
    await store.login('a@b.ru', 'pass');
    expect(store.token).toBe('access');
    expect(store.user).toEqual(user);
    expect(store.isAuthenticated).toBe(true);
  });

  it('logout clears state and localStorage', async () => {
    const store = useAuthStore();
    store.token = 't';
    store.refreshToken = 'r';
    store.user = { _id: '1', email: 'a@b.ru', role: 'driver', created_at: '', updated_at: '' };
    localStorage.setItem('token', 't');
    mockAuthApi.logout.mockResolvedValue(undefined);
    await store.logout();
    expect(store.token).toBeNull();
    expect(store.user).toBeNull();
    expect(localStorage.getItem('token')).toBeNull();
  });
});
