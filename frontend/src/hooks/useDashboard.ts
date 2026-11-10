'use client';

// Phase 10

// WHAT THIS FILE IS:
// The loading logic every dashboard page shares: send logged-out users to
// /login, send users whose role isn't allowed here to their own dashboard
// (the backend would answer 403 anyway), then load the page's data once.
// Returns the auth info, the data (null while loading), any error, and a
// logout handler.

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { logout } from '@/lib/api/auth';
import { DASHBOARD_ROUTES } from '@/lib/dashboard-routes';
import { UserRole } from '@/types/user';

export function useDashboard<T>(allowedRoles: UserRole[], load: (token: string) => Promise<T>) {
  const router = useRouter();
  const { user, token, loading, clearAuth } = useAuth();
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState('');

  const allowed = user !== null && allowedRoles.includes(user.role);

  useEffect(() => {
    if (loading) return;
    if (!token) { router.push('/login'); return; }
    if (user && !allowedRoles.includes(user.role)) { router.push(DASHBOARD_ROUTES[user.role]); return; }

    load(token)
      .then((result) => { setData(result); setError(''); })
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load dashboard'));
    // allowedRoles and load are fixed per page - only re-run when auth changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, user, loading, router]);

  async function handleLogout() {
    if (token) await logout(token);
    clearAuth();
    router.push('/login');
  }

  return { user, allowed, data, error, handleLogout };
}
