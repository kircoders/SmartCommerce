// Phase 10

// WHAT THIS FILE IS:
// The API client for the role dashboards (/api/dashboard/...). Each
// dashboard page makes exactly one request - the backend gathers every
// number and short list that page needs.

import {
  AdminDashboardData,
  CustomerDashboardData,
  OperationsDashboardData,
  SupportDashboardData,
  WarehouseDashboardData,
} from '@/types/dashboard';
import { API_URL } from './config';

// Same as lib/api/incidents.ts - { data: T } on success, { message } on
// failure.
async function getDashboard<T>(token: string, role: string): Promise<T> {
  const res = await fetch(`${API_URL}/dashboard/${role}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const json = await res.json();
  if (!res.ok) {
    const message = Array.isArray(json.message) ? json.message.join(', ') : json.message;
    throw new Error(message ?? 'Failed to load dashboard');
  }
  return json.data as T;
}

export function getCustomerDashboard(token: string): Promise<CustomerDashboardData> {
  return getDashboard(token, 'customer');
}

export function getSupportDashboard(token: string): Promise<SupportDashboardData> {
  return getDashboard(token, 'support');
}

export function getWarehouseDashboard(token: string): Promise<WarehouseDashboardData> {
  return getDashboard(token, 'warehouse');
}

export function getOperationsDashboard(token: string): Promise<OperationsDashboardData> {
  return getDashboard(token, 'operations');
}

export function getAdminDashboard(token: string): Promise<AdminDashboardData> {
  return getDashboard(token, 'admin');
}
