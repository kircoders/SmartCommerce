// Phase 12

// WHAT THIS FILE IS:
// The API client for audit logs (GET /api/admin/audit-logs) - ADMIN only,
// read-only. Unlike the other list endpoints, this one is paginated, so the
// response has `meta` (total, page, pageSize) next to `data`.

import { AuditLog, AuditLogFilters, AuditLogPage } from '@/types/audit-log';
import { API_URL } from './config';

interface ListResponse {
  data: AuditLog[];
  meta: { total: number; page: number; pageSize: number };
}

export async function getAuditLogs(token: string, filters: AuditLogFilters = {}): Promise<AuditLogPage> {
  const params = new URLSearchParams();
  if (filters.q?.trim()) params.set('q', filters.q.trim());
  if (filters.action) params.set('action', filters.action);
  if (filters.entityType) params.set('entityType', filters.entityType);
  if (filters.from) params.set('from', filters.from);
  if (filters.to) params.set('to', filters.to);
  if (filters.page) params.set('page', String(filters.page));
  if (filters.pageSize) params.set('pageSize', String(filters.pageSize));
  const query = params.toString() ? `?${params}` : '';

  const res = await fetch(`${API_URL}/admin/audit-logs${query}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const json = await res.json();
  if (!res.ok) {
    const message = Array.isArray(json.message) ? json.message.join(', ') : json.message;
    throw new Error(message ?? 'Failed to fetch audit logs');
  }
  const { data, meta } = json as ListResponse;
  return { items: data, ...meta };
}
