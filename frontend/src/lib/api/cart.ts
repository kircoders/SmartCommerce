// Phase 4

// WHAT THIS FILE IS:
// The API client for all cart requests to the backend - the frontend
// counterpart to api/src/cart/. Same pattern as lib/api/products.ts.
//
// NOTE: every one of these requires the caller to be a CUSTOMER - the
// backend's RolesGuard rejects any other role with a 403, including ADMIN
// (employees can't touch customer carts, even their own if they somehow
// had one).
//
// Every function here returns the FULL updated Cart, not just the thing
// you changed - matches what the backend actually sends back on every
// mutation (add/update/remove/clear all return the whole cart).

import { Cart } from '@/types/cart';
import { API_URL } from './config';

function authHeaders(token: string): HeadersInit {
  return { Authorization: `Bearer ${token}` };
}

export async function getCart(token: string): Promise<Cart> {
  const res = await fetch(`${API_URL}/cart`, { headers: authHeaders(token) });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message ?? 'Failed to fetch cart');
  return json.data;
}

export async function addToCart(
  token: string,
  productId: string,
  quantity: number,
): Promise<Cart> {
  const res = await fetch(`${API_URL}/cart/items`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders(token) },
    body: JSON.stringify({ productId, quantity }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message ?? 'Failed to add to cart');
  return json.data;
}

export async function updateCartItem(
  token: string,
  itemId: string,
  quantity: number,
): Promise<Cart> {
  const res = await fetch(`${API_URL}/cart/items/${itemId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...authHeaders(token) },
    body: JSON.stringify({ quantity }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message ?? 'Failed to update item');
  return json.data;
}

export async function removeCartItem(token: string, itemId: string): Promise<Cart> {
  const res = await fetch(`${API_URL}/cart/items/${itemId}`, {
    method: 'DELETE',
    headers: authHeaders(token),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message ?? 'Failed to remove item');
  return json.data;
}

export async function clearCart(token: string): Promise<Cart> {
  const res = await fetch(`${API_URL}/cart`, {
    method: 'DELETE',
    headers: authHeaders(token),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message ?? 'Failed to clear cart');
  return json.data;
}
