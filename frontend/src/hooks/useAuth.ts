'use client';

// Phase 1


// WHAT THIS FILE IS:
// A custom React hook that manages the logged-in user's authentication state.
// A "hook" in React is a reusable function that any component can call to
// access shared state or logic — in this case, who is logged in.
//
// WHY IT EXISTS:
// Every protected page needs to know: is there a logged-in user? What is their
// token? Instead of each page managing this separately, useAuth() gives any
// page instant access to the current auth state.
//
// HOW IT WORKS:
// When a user logs in, their JWT token and user info are saved to localStorage
// (the browser's built-in storage that persists across page refreshes).
// When any page calls useAuth(), it reads from localStorage to restore the session.
//
// WHAT IT RETURNS:
// - user: the logged-in User object (or null if not logged in)
// - token: the JWT token string (or null if not logged in)
// - loading: true while reading from localStorage on first load
// - saveAuth(): call this after login to save the token and user
// - clearAuth(): call this after logout to wipe the token and user

import { useCallback, useEffect, useState } from 'react';
import { User } from '@/types/user';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');
    if (storedToken && storedUser) {
      setToken(storedToken);
      setUser(JSON.parse(storedUser) as User);
    }
    setLoading(false);
  }, []);

  const saveAuth = useCallback((newToken: string, newUser: User) => {
    localStorage.setItem('token', newToken);
    localStorage.setItem('user', JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);
  }, []);

  const clearAuth = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
  }, []);

  return { user, token, loading, saveAuth, clearAuth };
}
