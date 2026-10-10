// Phase 5

// WHAT THIS FILE IS:
// The API client for /api/orders. placeOrder() takes no data to send at
// all - same reasoning as checkout.ts's validateCheckout() - everything
// the order needs (customer, items, prices) already exists server-side,
// in the customer's own active cart.

import { Order } from '@/types/order';
import { API_URL } from './config';

function authHeaders(token: string): HeadersInit {
  return { Authorization: `Bearer ${token}` };
}

export async function placeOrder(token: string): Promise<Order> {
  const res = await fetch(`${API_URL}/orders`, {
    method: 'POST',
    headers: authHeaders(token),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message ?? 'Failed to place order');
  return json.data;
}

export async function getOrders(token: string): Promise<Order[]> {
  const res = await fetch(`${API_URL}/orders`, { headers: authHeaders(token) });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message ?? 'Failed to fetch orders');
  return json.data;
}
