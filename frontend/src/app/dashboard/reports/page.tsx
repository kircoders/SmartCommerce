'use client';

// Phase 10

// WHAT THIS FILE IS:
// Reports & Analytics - OPERATIONS_MANAGER and ADMIN only. Pick a date
// range (or a quick preset), how to group the timeline (day/week/month),
// and a report tab. The page asks GET /api/reports/<tab> for that range
// and shows totals, breakdowns, a chart, a table, and a CSV download.
//
// Dates are the manager's own calendar days: the browser's time zone is
// sent along so "Today" means today where they are.

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import MenuItem from '@mui/material/MenuItem';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import TextField from '@mui/material/TextField';
import Alert from '@mui/material/Alert';
import DashboardShell from '@/components/dashboard/DashboardShell';
import {
  IncidentsView,
  OrdersView,
  ReturnsView,
  RevenueView,
  ShipmentsView,
  SummaryView,
  SupportView,
} from '@/components/reports/ReportViews';
import { useAuth } from '@/hooks/useAuth';
import { logout } from '@/lib/api/auth';
import { getReport } from '@/lib/api/reports';
import { DASHBOARD_ROUTES, INCIDENT_ROLES } from '@/lib/dashboard-routes';
import { ReportByType, ReportGroupBy, ReportType } from '@/types/reports';

const TABS: { value: ReportType; label: string }[] = [
  { value: 'summary', label: 'Business summary' },
  { value: 'orders', label: 'Orders' },
  { value: 'revenue', label: 'Revenue' },
  { value: 'shipments', label: 'Shipments' },
  { value: 'returns', label: 'Returns' },
  { value: 'support', label: 'Support' },
  { value: 'incidents', label: 'Incidents' },
];

// A loaded report remembers which tab it belongs to, so TypeScript knows
// e.g. `type: 'orders'` means `data` is an OrdersReport.
type LoadedReport = {
  [T in ReportType]: { key: string; type: T; data: ReportByType[T] };
}[ReportType];

// ---------- Date helpers (the browser's local calendar) ----------

function toDay(date: Date): string {
  // 'en-CA' formats as YYYY-MM-DD.
  return new Intl.DateTimeFormat('en-CA').format(date);
}

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return toDay(d);
}

function startOfWeek(): string {
  const d = new Date();
  // getDay: Sunday 0 ... Saturday 6. Weeks start on Monday, like the
  // backend's weekly grouping.
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return toDay(d);
}

function startOfMonth(): string {
  const d = new Date();
  d.setDate(1);
  return toDay(d);
}

const PRESETS: { label: string; from: () => string; groupBy: ReportGroupBy }[] = [
  { label: 'Today', from: () => daysAgo(0), groupBy: 'day' },
  { label: 'This week', from: startOfWeek, groupBy: 'day' },
  { label: 'This month', from: startOfMonth, groupBy: 'day' },
  { label: 'Last 30 days', from: () => daysAgo(29), groupBy: 'day' },
  { label: 'Last 12 months', from: () => daysAgo(364), groupBy: 'month' },
];

export default function ReportsPage() {
  const router = useRouter();
  const { user, token, loading: authLoading, clearAuth } = useAuth();

  const [tab, setTab] = useState<ReportType>('summary');
  const [from, setFrom] = useState(() => daysAgo(29));
  const [to, setTo] = useState(() => daysAgo(0));
  const [groupBy, setGroupBy] = useState<ReportGroupBy>('day');
  const [report, setReport] = useState<LoadedReport | null>(null);
  const [error, setError] = useState<{ key: string; message: string } | null>(null);

  const allowed = user !== null && INCIDENT_ROLES.includes(user.role);
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const rangeError = from && to && from > to ? '"From" has to be on or before "To".' : '';

  // Every combination of tab + filters is its own request. Comparing keys
  // tells us whether what's on screen matches what's selected (if not,
  // the new one is still loading) without extra loading state.
  const key = [tab, from, to, groupBy].join('|');
  const loading = !rangeError && report?.key !== key && error?.key !== key;

  useEffect(() => {
    if (authLoading) return;
    if (!token) { router.push('/login'); return; }
    if (user && !INCIDENT_ROLES.includes(user.role)) router.push(DASHBOARD_ROUTES[user.role]);
  }, [authLoading, token, user, router]);

  useEffect(() => {
    if (!token || !allowed || rangeError || !from || !to) return;
    const requestKey = [tab, from, to, groupBy].join('|');
    getReport(token, tab, { from, to, groupBy, timeZone })
      .then((data) => setReport({ key: requestKey, type: tab, data } as LoadedReport))
      .catch((err) =>
        setError({ key: requestKey, message: err instanceof Error ? err.message : 'Failed to load report' }),
      );
  }, [token, allowed, tab, from, to, groupBy, timeZone, rangeError]);

  async function handleLogout() {
    if (token) await logout(token);
    clearAuth();
    router.push('/login');
  }

  function applyPreset(preset: (typeof PRESETS)[number]) {
    setFrom(preset.from());
    setTo(daysAgo(0));
    setGroupBy(preset.groupBy);
  }

  if (!user || !allowed) return null;

  const today = daysAgo(0);
  const fileName = `${tab}-report_${from}_to_${to}.csv`;

  return (
    <DashboardShell
      title="Reports & Analytics"
      firstName={user.firstName}
      error={error?.key === key ? error.message : ''}
      onLogout={handleLogout}
      links={[{ label: 'Back to dashboard', href: DASHBOARD_ROUTES[user.role] }]}
    >
      {/* ---------- Filters ---------- */}
      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
        {PRESETS.map((p) => {
          const active = from === p.from() && to === today && groupBy === p.groupBy;
          return (
            <Button key={p.label} size="small" variant={active ? 'contained' : 'outlined'} onClick={() => applyPreset(p)}>
              {p.label}
            </Button>
          );
        })}
      </Box>
      <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center', mb: 2 }}>
        <TextField
          label="From"
          type="date"
          size="small"
          value={from}
          onChange={(e) => setFrom(e.target.value)}
          slotProps={{ inputLabel: { shrink: true }, htmlInput: { max: to } }}
        />
        <TextField
          label="To"
          type="date"
          size="small"
          value={to}
          onChange={(e) => setTo(e.target.value)}
          slotProps={{ inputLabel: { shrink: true }, htmlInput: { min: from } }}
        />
        <TextField
          select
          label="Group by"
          size="small"
          value={groupBy}
          onChange={(e) => setGroupBy(e.target.value as ReportGroupBy)}
          sx={{ minWidth: 140 }}
        >
          <MenuItem value="day">Day</MenuItem>
          <MenuItem value="week">Week</MenuItem>
          <MenuItem value="month">Month</MenuItem>
        </TextField>
        {loading && <CircularProgress size={24} />}
      </Box>
      {rangeError && <Alert severity="warning" sx={{ mb: 2 }}>{rangeError}</Alert>}

      <Tabs
        value={tab}
        onChange={(_, value: ReportType) => setTab(value)}
        variant="scrollable"
        scrollButtons="auto"
        sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}
      >
        {TABS.map((t) => (
          <Tab key={t.value} value={t.value} label={t.label} />
        ))}
      </Tabs>

      {/* ---------- The report ---------- */}
      {/* The last report stays on screen (faded) while the next one loads,
          so the page doesn't jump around. */}
      {/* Only show a report that belongs to the selected tab. Its own
          groupBy (from the response) labels the chart, so the labels
          always match the numbers even mid-load. */}
      {report && report.type === tab && (
        <Box sx={{ opacity: loading ? 0.5 : 1, transition: 'opacity 0.2s' }}>
          {report.type === 'summary' && (
            <SummaryView data={report.data} groupBy={report.data.range.groupBy} fileName={fileName} />
          )}
          {report.type === 'orders' && (
            <OrdersView data={report.data} groupBy={report.data.range.groupBy} fileName={fileName} />
          )}
          {report.type === 'revenue' && (
            <RevenueView data={report.data} groupBy={report.data.range.groupBy} fileName={fileName} />
          )}
          {report.type === 'shipments' && (
            <ShipmentsView data={report.data} groupBy={report.data.range.groupBy} fileName={fileName} />
          )}
          {report.type === 'returns' && (
            <ReturnsView data={report.data} groupBy={report.data.range.groupBy} fileName={fileName} />
          )}
          {report.type === 'support' && (
            <SupportView data={report.data} groupBy={report.data.range.groupBy} fileName={fileName} />
          )}
          {report.type === 'incidents' && (
            <IncidentsView data={report.data} groupBy={report.data.range.groupBy} fileName={fileName} />
          )}
        </Box>
      )}
    </DashboardShell>
  );
}
