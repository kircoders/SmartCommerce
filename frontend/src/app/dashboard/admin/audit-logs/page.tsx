'use client';

// Phase 12

// WHAT THIS FILE IS:
// The Audit Logs page at /dashboard/admin/audit-logs - ADMIN only, and
// read-only (nothing here can change or delete a log). Every recorded
// action, newest first, 25 per page. Filters (search, action, entity type,
// date range) are all sent to the backend; changing any of them goes back
// to page 1.
//
// Dates: the date pickers give a plain day ("2026-11-18") in the admin's
// own timezone. They're turned into exact start-of-day / end-of-day
// timestamps before sending, so "Nov 18" means Nov 18 where the admin is,
// not Nov 18 in UTC.

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Alert from '@mui/material/Alert';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import MenuItem from '@mui/material/MenuItem';
import Paper from '@mui/material/Paper';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TablePagination from '@mui/material/TablePagination';
import TableRow from '@mui/material/TableRow';
import { useAuth } from '@/hooks/useAuth';
import { getAuditLogs } from '@/lib/api/audit-logs';
import { DASHBOARD_ROUTES } from '@/lib/dashboard-routes';
import { AuditAction, AuditEntityType, AuditLogPage } from '@/types/audit-log';
import { humanize } from '@/types/dashboard';
import { UserRole } from '@/types/user';

const PAGE_SIZE_OPTIONS = [25, 50, 100];

// "2026-11-18" -> that day's first / last moment in the browser's timezone.
function startOfDay(day: string): string {
  return new Date(`${day}T00:00:00`).toISOString();
}
function endOfDay(day: string): string {
  return new Date(`${day}T23:59:59.999`).toISOString();
}

export default function AuditLogsPage() {
  const router = useRouter();
  const { user, token, loading: authLoading } = useAuth();

  const [result, setResult] = useState<AuditLogPage | null>(null);
  const [action, setAction] = useState<AuditAction | ''>('');
  const [entityType, setEntityType] = useState<AuditEntityType | ''>('');
  const [fromDay, setFromDay] = useState('');
  const [toDay, setToDay] = useState('');
  // What's typed vs. what's been searched - same as the incidents page.
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZE_OPTIONS[0]);
  const [error, setError] = useState('');

  useEffect(() => {
    if (authLoading) return;
    if (!token) { router.push('/login'); return; }
    if (user && user.role !== UserRole.ADMIN) { router.push(DASHBOARD_ROUTES[user.role]); return; }

    getAuditLogs(token, {
      q: search,
      action: action || undefined,
      entityType: entityType || undefined,
      from: fromDay ? startOfDay(fromDay) : undefined,
      to: toDay ? endOfDay(toDay) : undefined,
      page,
      pageSize,
    })
      .then((data) => { setResult(data); setError(''); })
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load audit logs'));
  }, [token, user, authLoading, router, search, action, entityType, fromDay, toDay, page, pageSize]);

  // Any filter change: show the spinner and go back to page 1.
  function changeFilter(apply: () => void) {
    setResult(null);
    setPage(1);
    apply();
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    changeFilter(() => setSearch(searchInput));
  }

  function clearFilters() {
    changeFilter(() => {
      setAction('');
      setEntityType('');
      setFromDay('');
      setToDay('');
      setSearchInput('');
      setSearch('');
    });
  }

  if (!user || !token || user.role !== UserRole.ADMIN) return null;

  const filtered = action !== '' || entityType !== '' || fromDay !== '' || toDay !== '' || search !== '';

  return (
    <Box sx={{ p: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Audit Logs</Typography>
        <Button variant="outlined" onClick={() => router.push(DASHBOARD_ROUTES[user.role])}>
          Back to Dashboard
        </Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 3, alignItems: 'center' }}>
        <Box component="form" onSubmit={handleSearch} sx={{ display: 'flex', gap: 1 }}>
          <TextField
            label="Search user or description"
            size="small"
            sx={{ width: 260 }}
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
          <Button type="submit" variant="outlined">Search</Button>
        </Box>

        <TextField
          select
          label="Action"
          size="small"
          sx={{ width: 230 }}
          value={action}
          onChange={(e) => changeFilter(() => setAction(e.target.value as AuditAction | ''))}
        >
          <MenuItem value="">All</MenuItem>
          {Object.values(AuditAction).map((a) => (
            <MenuItem key={a} value={a}>{humanize(a)}</MenuItem>
          ))}
        </TextField>

        <TextField
          select
          label="Entity type"
          size="small"
          sx={{ width: 180 }}
          value={entityType}
          onChange={(e) => changeFilter(() => setEntityType(e.target.value as AuditEntityType | ''))}
        >
          <MenuItem value="">All</MenuItem>
          {Object.values(AuditEntityType).map((t) => (
            <MenuItem key={t} value={t}>{humanize(t)}</MenuItem>
          ))}
        </TextField>

        <TextField
          type="date"
          label="From"
          size="small"
          value={fromDay}
          onChange={(e) => changeFilter(() => setFromDay(e.target.value))}
          slotProps={{ inputLabel: { shrink: true } }}
        />
        <TextField
          type="date"
          label="To"
          size="small"
          value={toDay}
          onChange={(e) => changeFilter(() => setToDay(e.target.value))}
          slotProps={{ inputLabel: { shrink: true } }}
        />

        {filtered && <Button onClick={clearFilters}>Clear filters</Button>}
      </Box>

      {!result ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 8 }}>
          <CircularProgress />
        </Box>
      ) : result.total === 0 ? (
        <Typography color="text.secondary">
          {filtered ? 'No audit logs match these filters.' : 'No audit logs yet.'}
        </Typography>
      ) : (
        <Paper>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Time</TableCell>
                  <TableCell>User</TableCell>
                  <TableCell>Action</TableCell>
                  <TableCell>Description</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {result.items.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell sx={{ whiteSpace: 'nowrap' }}>{new Date(log.createdAt).toLocaleString()}</TableCell>
                    <TableCell>
                      <Typography variant="body2">{log.user.firstName} {log.user.lastName}</Typography>
                      <Typography variant="caption" color="text.secondary">{humanize(log.user.role)}</Typography>
                    </TableCell>
                    <TableCell>
                      <Chip label={humanize(log.action)} size="small" variant="outlined" />
                    </TableCell>
                    <TableCell>{log.description}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          {/* MUI counts pages from 0; the backend counts from 1. */}
          <TablePagination
            component="div"
            count={result.total}
            page={page - 1}
            rowsPerPage={pageSize}
            rowsPerPageOptions={PAGE_SIZE_OPTIONS}
            onPageChange={(_, newPage) => { setResult(null); setPage(newPage + 1); }}
            onRowsPerPageChange={(e) => changeFilter(() => setPageSize(Number(e.target.value)))}
          />
        </Paper>
      )}
    </Box>
  );
}
