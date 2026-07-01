// WHAT THIS FILE IS:
// The API client for all user profile-related requests to the backend.
// Similar to auth.ts, these are plain functions that make HTTP requests —
// no UI, no components, just data fetching.
//
// WHY IT EXISTS:
// Keeps all backend communication in one place. The profile page just calls
// getProfile() and updateProfile() without knowing anything about fetch,
// headers, or the backend URL.
//
// WHAT'S IN IT:
// - getProfile(): sends GET /api/users/me with the JWT token, returns the logged-in user's profile
// - updateProfile(): sends PUT /api/users/me with updated fields, returns the updated user
//
// NOTE: Both functions require the JWT token to be passed in because these
// are protected endpoints — the backend rejects requests without a valid token.

import { User } from '@/types/user';

const API_URL = 'http://smartcommerce-alb-632503281.us-east-1.elb.amazonaws.com/api';

export interface UpdateProfileData {
  firstName?: string;
  lastName?: string;
  email?: string;
}

export async function getProfile(token: string): Promise<User> {
  const res = await fetch(`${API_URL}/users/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  const json = await res.json();
  if (!res.ok) throw new Error(json.message ?? 'Failed to fetch profile');
  return json.data;
}

export async function updateProfile(token: string, data: UpdateProfileData): Promise<User> {
  const res = await fetch(`${API_URL}/users/me`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });

  const json = await res.json();
  if (!res.ok) throw new Error(json.message ?? 'Failed to update profile');
  return json.data;
}
