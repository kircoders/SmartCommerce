'use client';

// Phase 9

// WHAT THIS FILE IS:
// The Incidents page at /dashboard/incidents - OPERATIONS_MANAGER and ADMIN
// only. Every incident, most recently updated first, with search and
// status/severity/type filters that are all sent to the backend. The
// filters start from the URL (?status=UNRESOLVED&severity=CRITICAL), so the
// operations dashboard's count cards can link straight to a filtered list.
// "Open or in progress" (UNRESOLVED) is a frontend-only status choice -
// it's sent as ?unresolved=true, and matches the dashboard's "Open" count.
// "New incident" opens the create popup; creating one goes to its details.

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
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
import TableRow from '@mui/material/TableRow';
import { useAuth } from '@/hooks/useAuth';
import { getIncidents } from '@/lib/api/incidents';
import { DASHBOARD_ROUTES, INCIDENT_ROLES } from '@/lib/dashboard-routes';
import IncidentFormDialog from '@/components/incidents/IncidentFormDialog';
import {
  INCIDENT_STATUS_COLORS,
  INCIDENT_STATUS_LABELS,
  INCIDENT_TYPE_LABELS,
  Incident,
  IncidentSeverity,
  IncidentStatus,
  IncidentType,
  SEVERITY_COLORS,
  SEVERITY_LABELS,
} from '@/types/incident';

const UNRESOLVED = 'UNRESOLVED';
type StatusFilter = IncidentStatus | typeof UNRESOLVED | '';

// Only accept values from the enum, so a hand-edited URL can't send junk.
function parseEnum<T extends string>(values: T[], value: string | null | undefined): T | '' {
  return values.find((v) => v === value) ?? '';
}

// useSearchParams() requires a Suspense boundary - same reasoning as the
// shipment detail page.
export default function IncidentsPage() {
  return (
    <Suspense fallback={null}>
      <IncidentsList />
    </Suspense>
  );
}

function IncidentsList() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, token, loading: authLoading } = useAuth();

  const [incidents, setIncidents] = useState<Incident[] | null>(null);
  const [status, setStatus] = useState<StatusFilter>(
    parseEnum<IncidentStatus | typeof UNRESOLVED>([...Object.values(IncidentStatus), UNRESOLVED], searchParams?.get('status')),
  );
  const [severity, setSeverity] = useState<IncidentSeverity | ''>(
    parseEnum(Object.values(IncidentSeverity), searchParams?.get('severity')),
  );
  const [type, setType] = useState<IncidentType | ''>(parseEnum(Object.values(IncidentType), searchParams?.get('type')));
  // What's typed vs. what's been searched - the search only runs on Enter
  // or the Search button, not on every keystroke.
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (authLoading) return;
    if (!token) { router.push('/login'); return; }
    if (user && !INCIDENT_ROLES.includes(user.role)) { router.push(DASHBOARD_ROUTES[user.role]); return; }

    getIncidents(token, {
      status: status && status !== UNRESOLVED ? status : undefined,
      unresolved: status === UNRESOLVED,
      severity: severity || undefined,
      type: type || undefined,
      q: search,
    })
      .then((data) => { setIncidents(data); setError(''); })
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load incidents'));
  }, [token, user, authLoading, router, status, severity, type, search]);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setIncidents(null);
    setSearch(searchInput);
  }

  function clearFilters() {
    setIncidents(null);
    setStatus('');
    setSeverity('');
    setType('');
    setSearchInput('');
    setSearch('');
  }

  if (!user || !token || !INCIDENT_ROLES.includes(user.role)) return null;

  const filtered = status !== '' || severity !== '' || type !== '' || search !== '';

  return (
    <Box sx={{ p: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Incidents</Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button variant="contained" onClick={() => setCreating(true)}>New incident</Button>
          <Button variant="outlined" onClick={() => router.push(DASHBOARD_ROUTES[user.role])}>
            Back to Dashboard
          </Button>
        </Box>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 3, alignItems: 'center' }}>
        <Box component="form" onSubmit={handleSearch} sx={{ display: 'flex', gap: 1 }}>
          <TextField
            label="Search title or description"
            size="small"
            sx={{ width: 280 }}
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
          <Button type="submit" variant="outlined">Search</Button>
        </Box>

        <TextField
          select
          label="Status"
          size="small"
          sx={{ width: 200 }}
          value={status}
          onChange={(e) => { setIncidents(null); setStatus(e.target.value as StatusFilter); }}
        >
          <MenuItem value="">All</MenuItem>
          <MenuItem value={UNRESOLVED}>Open or in progress</MenuItem>
          {Object.values(IncidentStatus).map((s) => (
            <MenuItem key={s} value={s}>{INCIDENT_STATUS_LABELS[s]}</MenuItem>
          ))}
        </TextField>

        <TextField
          select
          label="Severity"
          size="small"
          sx={{ width: 160 }}
          value={severity}
          onChange={(e) => { setIncidents(null); setSeverity(e.target.value as IncidentSeverity | ''); }}
        >
          <MenuItem value="">All</MenuItem>
          {Object.values(IncidentSeverity).map((s) => (
            <MenuItem key={s} value={s}>{SEVERITY_LABELS[s]}</MenuItem>
          ))}
        </TextField>

        <TextField
          select
          label="Type"
          size="small"
          sx={{ width: 200 }}
          value={type}
          onChange={(e) => { setIncidents(null); setType(e.target.value as IncidentType | ''); }}
        >
          <MenuItem value="">All</MenuItem>
          {Object.values(IncidentType).map((t) => (
            <MenuItem key={t} value={t}>{INCIDENT_TYPE_LABELS[t]}</MenuItem>
          ))}
        </TextField>

        {filtered && <Button onClick={clearFilters}>Clear filters</Button>}
      </Box>

      {!incidents ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 8 }}>
          <CircularProgress />
        </Box>
      ) : incidents.length === 0 ? (
        <Typography color="text.secondary">
          {filtered ? 'No incidents match these filters.' : 'No incidents yet.'}
        </Typography>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Title</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>Severity</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Created By</TableCell>
                <TableCell>Last Updated</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {incidents.map((incident) => (
                <TableRow
                  key={incident.id}
                  hover
                  sx={{ cursor: 'pointer' }}
                  onClick={() => router.push(`/dashboard/incidents/detail?id=${incident.id}`)}
                >
                  <TableCell sx={{ maxWidth: 320, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {incident.title}
                  </TableCell>
                  <TableCell>{INCIDENT_TYPE_LABELS[incident.type]}</TableCell>
                  <TableCell>
                    <Chip label={SEVERITY_LABELS[incident.severity]} size="small" color={SEVERITY_COLORS[incident.severity]} />
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={INCIDENT_STATUS_LABELS[incident.status]}
                      size="small"
                      variant="outlined"
                      color={INCIDENT_STATUS_COLORS[incident.status]}
                    />
                  </TableCell>
                  <TableCell>{incident.creator ? `${incident.creator.firstName} ${incident.creator.lastName}` : '—'}</TableCell>
                  <TableCell>{new Date(incident.updatedAt).toLocaleString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <IncidentFormDialog
        open={creating}
        token={token}
        onClose={() => setCreating(false)}
        onSaved={(incident) => router.push(`/dashboard/incidents/detail?id=${incident.id}`)}
      />
    </Box>
  );
}
