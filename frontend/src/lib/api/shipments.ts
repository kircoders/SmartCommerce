// Phase 6

// WHAT THIS FILE IS:
// The API client for shipments - both the warehouse-facing routes
// (/api/warehouse/shipments/...) and the customer-facing one
// (/api/orders/:orderId/shipment).

import { Shipment, ShipmentStatus } from '@/types/shipment';
import { API_URL } from './config';

function authHeaders(token: string): HeadersInit {
  return { Authorization: `Bearer ${token}` };
}

// status is optional - omit it to get the full queue, pass it to narrow
// down to just one status (e.g. "show me only what still needs packing").
export async function getShipmentQueue(
  token: string,
  status?: ShipmentStatus,
): Promise<Shipment[]> {
  const url = status
    ? `${API_URL}/warehouse/shipments?status=${status}`
    : `${API_URL}/warehouse/shipments`;
  const res = await fetch(url, { headers: authHeaders(token) });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message ?? 'Failed to fetch shipments');
  return json.data;
}

export async function getShipment(token: string, id: string): Promise<Shipment> {
  const res = await fetch(`${API_URL}/warehouse/shipments/${id}`, {
    headers: authHeaders(token),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message ?? 'Failed to fetch shipment');
  return json.data;
}

export async function updateShipmentStatus(
  token: string,
  id: string,
  status: ShipmentStatus,
): Promise<Shipment> {
  const res = await fetch(`${API_URL}/warehouse/shipments/${id}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...authHeaders(token) },
    body: JSON.stringify({ status }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message ?? 'Failed to update shipment status');
  return json.data;
}

export async function updateTrackingNumber(
  token: string,
  id: string,
  trackingNumber: string,
): Promise<Shipment> {
  const res = await fetch(`${API_URL}/warehouse/shipments/${id}/tracking`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...authHeaders(token) },
    body: JSON.stringify({ trackingNumber }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message ?? 'Failed to update tracking number');
  return json.data;
}

// Customer-facing - scoped to the requesting customer's own order.
export async function getShipmentForOrder(token: string, orderId: string): Promise<Shipment> {
  const res = await fetch(`${API_URL}/orders/${orderId}/shipment`, {
    headers: authHeaders(token),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message ?? 'Failed to fetch shipment');
  return json.data;
}
