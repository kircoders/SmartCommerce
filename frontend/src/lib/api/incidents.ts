// Phase 9

// WHAT THIS FILE IS:
// The API client for incidents (/api/incidents/...) - OPERATIONS_MANAGER
// and ADMIN only.

import {
  CreateIncidentInput,
  Incident,
  IncidentFilters,
  IncidentStatus,
  IncidentSummary,
  UpdateIncidentInput,
} from '@/types/incident';
import { API_URL } from './config';

function authHeaders(token: string): HeadersInit {
  return { Authorization: `Bearer ${token}` };
}

function jsonHeaders(token: string): HeadersInit {
  return { 'Content-Type': 'application/json', ...authHeaders(token) };
}

// Same as lib/api/returns.ts - { data: T } on success, { message } on
// failure. Validation errors come back as an array of messages.
async function unwrap<T>(res: Response, fallbackError: string): Promise<T> {
  const json = await res.json();
  if (!res.ok) {
    const message = Array.isArray(json.message) ? json.message.join(', ') : json.message;
    throw new Error(message ?? fallbackError);
  }
  return json.data as T;
}

export async function getIncidents(token: string, filters: IncidentFilters = {}): Promise<Incident[]> {
  const params = new URLSearchParams();
  if (filters.status) params.set('status', filters.status);
  if (filters.unresolved) params.set('unresolved', 'true');
  if (filters.severity) params.set('severity', filters.severity);
  if (filters.type) params.set('type', filters.type);
  if (filters.q?.trim()) params.set('q', filters.q.trim());
  const query = params.toString() ? `?${params}` : '';
  const res = await fetch(`${API_URL}/incidents${query}`, { headers: authHeaders(token) });
  return unwrap(res, 'Failed to fetch incidents');
}

export async function getIncidentSummary(token: string): Promise<IncidentSummary> {
  const res = await fetch(`${API_URL}/incidents/summary`, { headers: authHeaders(token) });
  return unwrap(res, 'Failed to fetch incident summary');
}

export async function getIncident(token: string, id: string): Promise<Incident> {
  const res = await fetch(`${API_URL}/incidents/${id}`, { headers: authHeaders(token) });
  return unwrap(res, 'Failed to fetch incident');
}

export async function createIncident(token: string, input: CreateIncidentInput): Promise<Incident> {
  const res = await fetch(`${API_URL}/incidents`, {
    method: 'POST',
    headers: jsonHeaders(token),
    body: JSON.stringify(input),
  });
  return unwrap(res, 'Failed to create incident');
}

export async function updateIncident(token: string, id: string, changes: UpdateIncidentInput): Promise<Incident> {
  const res = await fetch(`${API_URL}/incidents/${id}`, {
    method: 'PUT',
    headers: jsonHeaders(token),
    body: JSON.stringify(changes),
  });
  return unwrap(res, 'Failed to update incident');
}

export async function updateIncidentStatus(token: string, id: string, status: IncidentStatus): Promise<Incident> {
  const res = await fetch(`${API_URL}/incidents/${id}/status`, {
    method: 'PATCH',
    headers: jsonHeaders(token),
    body: JSON.stringify({ status }),
  });
  return unwrap(res, 'Failed to update incident status');
}

export async function resolveIncident(token: string, id: string): Promise<Incident> {
  const res = await fetch(`${API_URL}/incidents/${id}/resolve`, {
    method: 'PATCH',
    headers: authHeaders(token),
  });
  return unwrap(res, 'Failed to resolve incident');
}
