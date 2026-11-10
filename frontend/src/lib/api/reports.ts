// Phase 10

// WHAT THIS FILE IS:
// The API client for business reports (/api/reports/...) -
// OPERATIONS_MANAGER and ADMIN only. One function covers all seven
// reports: they share the same filters and response wrapper.

import { ReportByType, ReportFilters, ReportType } from '@/types/reports';
import { API_URL } from './config';

export async function getReport<T extends ReportType>(
  token: string,
  type: T,
  filters: ReportFilters,
): Promise<ReportByType[T]> {
  const params = new URLSearchParams({
    from: filters.from,
    to: filters.to,
    groupBy: filters.groupBy,
    timeZone: filters.timeZone,
  });
  // The summary lives at /api/reports itself; the rest at /api/reports/<type>.
  const path = type === 'summary' ? '' : `/${type}`;

  const res = await fetch(`${API_URL}/reports${path}?${params}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const json = await res.json();
  if (!res.ok) {
    const message = Array.isArray(json.message) ? json.message.join(', ') : json.message;
    throw new Error(message ?? 'Failed to load report');
  }
  return json.data as ReportByType[T];
}
