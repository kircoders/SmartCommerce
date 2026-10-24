// Phase 8

// WHAT THIS FILE IS:
// The API client for returns and refunds - the customer routes
// (/api/returns/...), the staff routes (/api/support/returns/...), and
// refunds (/api/refunds).

import {
  CreateReturnInput,
  Refund,
  ReturnEvidence,
  ReturnRequest,
  ReturnStatus,
  StaffReturnStatus,
} from '@/types/returns';
import { API_URL } from './config';

function authHeaders(token: string): HeadersInit {
  return { Authorization: `Bearer ${token}` };
}

function jsonHeaders(token: string): HeadersInit {
  return { 'Content-Type': 'application/json', ...authHeaders(token) };
}

// Same as lib/api/support.ts - { data: T } on success, { message } on
// failure. A rejected upload can come back as an array of messages.
async function unwrap<T>(res: Response, fallbackError: string): Promise<T> {
  const json = await res.json();
  if (!res.ok) {
    const message = Array.isArray(json.message) ? json.message.join(', ') : json.message;
    throw new Error(message ?? fallbackError);
  }
  return json.data as T;
}

// ---- Customer ----

export async function createReturn(token: string, input: CreateReturnInput): Promise<ReturnRequest> {
  const res = await fetch(`${API_URL}/returns`, {
    method: 'POST',
    headers: jsonHeaders(token),
    body: JSON.stringify(input),
  });
  return unwrap(res, 'Failed to request return');
}

export async function getMyReturns(token: string): Promise<ReturnRequest[]> {
  const res = await fetch(`${API_URL}/returns/me`, { headers: authHeaders(token) });
  return unwrap(res, 'Failed to fetch returns');
}

export async function getMyReturn(token: string, id: string): Promise<ReturnRequest> {
  const res = await fetch(`${API_URL}/returns/me/${id}`, { headers: authHeaders(token) });
  return unwrap(res, 'Failed to fetch return');
}

// multipart/form-data with the image in a "file" field. No Content-Type
// header on purpose - the browser sets it, including the boundary.
export async function uploadReturnPhoto(token: string, id: string, file: File): Promise<ReturnEvidence> {
  const body = new FormData();
  body.append('file', file);
  const res = await fetch(`${API_URL}/returns/${id}/evidence`, {
    method: 'POST',
    headers: authHeaders(token),
    body,
  });
  return unwrap(res, 'Failed to upload photo');
}

// ---- Staff ----

export async function getReturnQueue(token: string, status?: ReturnStatus): Promise<ReturnRequest[]> {
  const query = status ? `?status=${status}` : '';
  const res = await fetch(`${API_URL}/support/returns${query}`, { headers: authHeaders(token) });
  return unwrap(res, 'Failed to fetch returns');
}

export async function getStaffReturn(token: string, id: string): Promise<ReturnRequest> {
  const res = await fetch(`${API_URL}/support/returns/${id}`, { headers: authHeaders(token) });
  return unwrap(res, 'Failed to fetch return');
}

export async function updateReturn(
  token: string,
  id: string,
  changes: { status?: StaffReturnStatus; internalNotes?: string },
): Promise<ReturnRequest> {
  const res = await fetch(`${API_URL}/support/returns/${id}/status`, {
    method: 'PATCH',
    headers: jsonHeaders(token),
    body: JSON.stringify(changes),
  });
  return unwrap(res, 'Failed to update return');
}

// ---- Refunds (OPERATIONS_MANAGER / ADMIN) ----

export async function issueRefund(token: string, returnId: string): Promise<Refund> {
  const res = await fetch(`${API_URL}/refunds`, {
    method: 'POST',
    headers: jsonHeaders(token),
    body: JSON.stringify({ returnId }),
  });
  return unwrap(res, 'Failed to issue refund');
}
