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

import { User } from '@/types/user';

const API_URL = 'https://3hfuwvhp27.us-east-1.awsapprunner.com/api';

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

export async function login(data: LoginData): Promise<LoginResponse> {
  const res = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

  const json = await res.json();
  if (!res.ok) throw new Error(json.message ?? 'Login failed');
  return json.data;
}

export async function logout(token: string): Promise<void> {
  await fetch(`${API_URL}/auth/logout`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
}
