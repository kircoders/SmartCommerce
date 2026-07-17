// Phase 3

// WHAT THIS FILE IS:
// The API client for all inventory requests to the backend - the frontend
// counterpart to api/src/inventory/. Same pattern as lib/api/products.ts.
//
// NOTE: every one of these requires the caller to be WAREHOUSE_OPERATOR,
// OPERATIONS_MANAGER, or ADMIN - the backend's RolesGuard rejects anyone
// else with a 403, including CUSTOMER and SUPPORT_AGENT (no read access
// either, unlike products).

import { Inventory, InventoryAdjustment, AdjustmentType } from '@/types/inventory';
import { API_URL } from './config';

export interface UpdateInventoryData {
  quantityAvailable?: number;
  quantityReserved?: number;
  quantityTotal?: number;
  lowStockThreshold?: number;
}

export interface CreateAdjustmentData {
  productId: string;
  adjustmentType: AdjustmentType;
  quantityChange: number;
  reason?: string;
}

function authHeaders(token: string): HeadersInit {
  return { Authorization: `Bearer ${token}` };
}

export async function getInventory(token: string): Promise<Inventory[]> {
  const res = await fetch(`${API_URL}/inventory`, { headers: authHeaders(token) });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message ?? 'Failed to fetch inventory');
  return json.data;
}

export async function getLowStock(token: string): Promise<Inventory[]> {
  const res = await fetch(`${API_URL}/inventory/low-stock`, { headers: authHeaders(token) });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message ?? 'Failed to fetch low-stock inventory');
  return json.data;
}

export async function getInventoryForProduct(token: string, productId: string): Promise<Inventory> {
  const res = await fetch(`${API_URL}/inventory/${productId}`, { headers: authHeaders(token) });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message ?? 'Failed to fetch inventory record');
  return json.data;
}

export async function updateInventory(
  token: string,
  productId: string,
  data: UpdateInventoryData,
): Promise<Inventory> {
  const res = await fetch(`${API_URL}/inventory/${productId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...authHeaders(token) },
    body: JSON.stringify(data),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message ?? 'Failed to update inventory');
  return json.data;
}

export async function createAdjustment(
  token: string,
  data: CreateAdjustmentData,
): Promise<InventoryAdjustment> {
  const res = await fetch(`${API_URL}/inventory/adjustments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders(token) },
    body: JSON.stringify(data),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message ?? 'Failed to record adjustment');
  return json.data;
}

export async function getAdjustments(token: string, productId: string): Promise<InventoryAdjustment[]> {
  const res = await fetch(`${API_URL}/inventory/${productId}/adjustments`, {
    headers: authHeaders(token),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message ?? 'Failed to fetch adjustment history');
  return json.data;
}
