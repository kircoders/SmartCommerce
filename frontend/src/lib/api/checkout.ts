// Phase 4

// WHAT THIS FILE IS:
// The API client for /api/checkout - kept as its own file rather than
// folded into lib/api/cart.ts, mirroring the backend's separate
// CheckoutController vs CartController split.

import { Cart, CheckoutValidation } from '@/types/cart';
import { API_URL } from './config';

function authHeaders(token: string): HeadersInit {
  return { Authorization: `Bearer ${token}` };
}

// Same data as getCart() - a separate function anyway, since it's hitting
// a conceptually different endpoint (the read-only confirmation screen,
// not the editable cart).
export async function getCheckout(token: string): Promise<Cart> {
  const res = await fetch(`${API_URL}/checkout`, { headers: authHeaders(token) });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message ?? 'Failed to fetch checkout summary');
  return json.data;
}

// Re-checks every cart item against CURRENT stock. Doesn't modify
// anything - just reports whether it's safe to proceed.
export async function validateCheckout(token: string): Promise<CheckoutValidation> {
  const res = await fetch(`${API_URL}/checkout/validate`, {
    method: 'POST',
    headers: authHeaders(token),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message ?? 'Failed to validate checkout');
  return json.data;
}
