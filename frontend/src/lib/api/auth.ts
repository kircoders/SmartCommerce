// Phase 1

// WHAT THIS FILE IS:
// The API client for all authentication-related requests to the backend.
// It contains plain functions (not components) that make HTTP requests to
// the NestJS backend running on http://localhost:3000.
//
// WHY IT EXISTS:
// Instead of writing raw fetch() calls scattered across every page,
// all backend communication is centralized here. Pages just call these
// functions and get back clean data â€” they don't need to know anything
// about HTTP, headers, or JSON parsing.
//
// WHAT'S IN IT:
// - register(): sends POST /api/auth/register, returns the new User
// - login(): sends POST /api/auth/login, returns the JWT token + user + redirectTo
// - logout(): sends POST /api/auth/logout to end the session on the backend

import axios from 'axios';
import { User } from '@/types/user';
import { API_URL } from './config';

export interface RegisterData {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
}

export interface LoginData {
  email: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  user: User;
  redirectTo: string;
}

export async function register(data: RegisterData): Promise<User> {
  const res = await fetch(`${API_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

  const json = await res.json();
  if (!res.ok) throw new Error(json.message ?? 'Registration failed');
  return json.data;
}

// Uses Axios instead of fetch() - the difference that actually matters
// here: Axios automatically throws for any non-2xx response (a fetch()
// with a 401 just comes back as a normal, non-throwing response you have
// to check res.ok on yourself). That's why the error handling below is a
// single catch block instead of the separate "if (!res.ok)" check the
// other functions in this file still use.
export async function login(data: LoginData): Promise<LoginResponse> {
  try {
    const response = await axios.post<{ data: LoginResponse }>(`${API_URL}/auth/login`, data);
    return response.data.data;
  } catch (err) {
    if (axios.isAxiosError(err)) {
      // err.response only exists if the server actually responded (with
      // an error status) - if it's missing entirely, the request never
      // reached the backend at all (same case fetch() handled via its
      // own try/catch before).
      console.log('Login request failed with status:', err.response?.status);

      if (!err.response) {
        throw new Error('Cannot reach the server - is the backend running?');
      }
      const body = err.response.data as { message?: string } | undefined;
      throw new Error(body?.message ?? 'Login failed');
    }
    throw err;
  }
}

export async function logout(token: string): Promise<void> {
  // Doesn't throw on failure on purpose - whoever calls this clears the
  // local token/redirects regardless (see useAuth().clearAuth()), since a
  // broken server-side logout shouldn't trap someone in a logged-in state
  // they're trying to leave. Still worth knowing if it failed though, so
  // it's not completely silent.
  const res = await fetch(`${API_URL}/auth/logout`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    console.error(`Server-side logout failed with status ${res.status}`);
  }
}
