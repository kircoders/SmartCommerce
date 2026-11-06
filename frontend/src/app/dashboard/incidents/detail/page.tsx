'use client';

// Phase 9

// WHAT THIS FILE IS:
// The Incident Details page at /dashboard/incidents/detail?id=... -
// OPERATIONS_MANAGER and ADMIN only. Two columns:
//   - Left: what happened - description, plus the linked order and
//     shipment (the shipment links to its warehouse page).
//   - Right: what to do about it - the next steps for the current status,
//     the notes box, and who created it and when.
// Only the valid next steps are offered (the same rules the backend
// enforces): OPEN -> start working or resolve, IN_PROGRESS -> resolve,
// RESOLVED -> close or reopen. Closing can't be undone, so it asks first.
// A closed incident can't be edited, so Edit and the notes box go away.

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Alert from '@mui/material/Alert';
import Chip from '@mui/material/Chip';
import Paper from '@mui/material/Paper';
import CircularProgress from '@mui/material/CircularProgress';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogActions from '@mui/material/DialogActions';
import { useAuth } from '@/hooks/useAuth';
import { getIncident, resolveIncident, updateIncident, updateIncidentStatus } from '@/lib/api/incidents';
import { DASHBOARD_ROUTES, INCIDENT_ROLES } from '@/lib/dashboard-routes';
import IncidentFormDialog from '@/components/incidents/IncidentFormDialog';
import {
  INCIDENT_STATUS_COLORS,
  INCIDENT_STATUS_LABELS,
  INCIDENT_TYPE_LABELS,
  Incident,
  IncidentStatus,
  SEVERITY_COLORS,
  SEVERITY_LABELS,
} from '@/types/incident';

type Action = 'start' | 'resolve' | 'close' | 'reopen' | 'notes';

// useSearchParams() requires a Suspense boundary - same reasoning as the
// shipment detail page.
export default function IncidentDetailPage() {
  return (
    <Suspense fallback={null}>
      <IncidentDetail />
    </Suspense>
  );
}

function IncidentDetail() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const incidentId = searchParams?.get('id') ?? '';
  const { user, token, loading: authLoading } = useAuth();

  const [incident, setIncident] = useState<Incident | null>(null);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState<Action | null>(null);
  const [confirmingClose, setConfirmingClose] = useState(false);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState('');

  function applyIncident(data: Incident) {
    setIncident(data);
    setNotes(data.notes ?? '');
  }

  useEffect(() => {
    if (authLoading) return;
    if (!token) { router.push('/login'); return; }
    if (user && !INCIDENT_ROLES.includes(user.role)) { router.push(DASHBOARD_ROUTES[user.role]); return; }
    if (!incidentId) { router.push('/dashboard/incidents'); return; }

    getIncident(token, incidentId)
      .then(applyIncident)
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load incident'));
  }, [token, user, authLoading, router, incidentId]);

  async function run(action: Action) {
    if (!token) return;
    setConfirmingClose(false);
    setError('');
    setSaving(action);
    try {
      if (action === 'resolve') {
        await resolveIncident(token, incidentId);
      } else if (action === 'notes') {
        await updateIncident(token, incidentId, { notes });
      } else {
        const status = {
          start: IncidentStatus.IN_PROGRESS,
          reopen: IncidentStatus.IN_PROGRESS,
          close: IncidentStatus.CLOSED,
        } as const;
        await updateIncidentStatus(token, incidentId, status[action]);
      }
      // Re-fetch rather than trusting each response's shape - the page
      // always shows what the backend actually saved.
      applyIncident(await getIncident(token, incidentId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setSaving(null);
    }
  }

  if (!user || !token || !INCIDENT_ROLES.includes(user.role)) return null;

  if (!incident) {
    return error ? (
      <Box sx={{ p: 4 }}>
        <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>
        <Button variant="outlined" onClick={() => router.push('/dashboard/incidents')}>Back to Incidents</Button>
      </Box>
    ) : (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  const closed = incident.status === IncidentStatus.CLOSED;
  const busy = saving !== null;

  return (
    <Box sx={{ p: 4, width: '100%', maxWidth: 1200, mx: 'auto' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1, gap: 2 }}>
        <Typography variant="h5">{incident.title}</Typography>
        <Box sx={{ display: 'flex', gap: 1, flexShrink: 0 }}>
          {!closed && (
            <Button variant="outlined" size="small" disabled={busy} onClick={() => setEditing(true)}>Edit</Button>
          )}
          <Button variant="outlined" size="small" onClick={() => router.push('/dashboard/incidents')}>
            Back to Incidents
          </Button>
        </Box>
      </Box>
      <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap', mb: 3 }}>
        <Chip label={SEVERITY_LABELS[incident.severity]} size="small" color={SEVERITY_COLORS[incident.severity]} />
        <Chip
          label={INCIDENT_STATUS_LABELS[incident.status]}
          size="small"
          variant="outlined"
          color={INCIDENT_STATUS_COLORS[incident.status]}
        />
        <Chip label={INCIDENT_TYPE_LABELS[incident.type]} size="small" variant="outlined" />
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '2fr 1fr' }, gap: 4, alignItems: 'start' }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <Box>
            <Typography variant="h6" sx={{ mb: 1 }}>Description</Typography>
            <Typography sx={{ whiteSpace: 'pre-wrap' }}>{incident.description}</Typography>
          </Box>

          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
            <Paper variant="outlined" sx={{ p: 2 }}>
              <Typography variant="subtitle1" sx={{ mb: 1 }}>Related order</Typography>
              {incident.order ? (
                <>
                  <Typography sx={{ fontFamily: 'monospace' }}>#{incident.order.id.slice(0, 8)}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Placed {new Date(incident.order.createdAt).toLocaleDateString()} · $
                    {Number(incident.order.totalAmount).toFixed(2)}
                  </Typography>
                  <Chip label={incident.order.status} size="small" sx={{ mt: 1 }} />
                </>
              ) : (
                <Typography color="text.secondary">None linked</Typography>
              )}
            </Paper>

            <Paper variant="outlined" sx={{ p: 2 }}>
              <Typography variant="subtitle1" sx={{ mb: 1 }}>Related shipment</Typography>
              {incident.shipment ? (
                <>
                  <Typography variant="body2" color="text.secondary">
                    Tracking: {incident.shipment.trackingNumber ?? 'none yet'}
                  </Typography>
                  <Chip label={incident.shipment.status} size="small" sx={{ mt: 1, mb: 1 }} />
                  <Box>
                    <Button
                      size="small"
                      onClick={() => router.push(`/dashboard/warehouse/shipments/detail?id=${incident.shipmentId}`)}
                    >
                      View shipment
                    </Button>
                  </Box>
                </>
              ) : (
                <Typography color="text.secondary">None linked</Typography>
              )}
            </Paper>
          </Box>
        </Box>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Paper variant="outlined" sx={{ p: 2 }}>
            <Typography variant="subtitle1" sx={{ mb: 1 }}>Next step</Typography>

            {incident.status === IncidentStatus.OPEN && (
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button variant="contained" fullWidth disabled={busy} onClick={() => run('start')}>
                  {saving === 'start' ? 'Saving...' : 'Start working'}
                </Button>
                <Button variant="contained" color="success" fullWidth disabled={busy} onClick={() => run('resolve')}>
                  {saving === 'resolve' ? 'Saving...' : 'Resolve'}
                </Button>
              </Box>
            )}

            {incident.status === IncidentStatus.IN_PROGRESS && (
              <Button variant="contained" color="success" fullWidth disabled={busy} onClick={() => run('resolve')}>
                {saving === 'resolve' ? 'Saving...' : 'Mark resolved'}
              </Button>
            )}

            {incident.status === IncidentStatus.RESOLVED && (
              <>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  Close it once you&apos;re sure it&apos;s fixed, or reopen it if the problem came back.
                </Typography>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Button variant="contained" fullWidth disabled={busy} onClick={() => setConfirmingClose(true)}>
                    {saving === 'close' ? 'Saving...' : 'Close'}
                  </Button>
                  <Button variant="outlined" fullWidth disabled={busy} onClick={() => run('reopen')}>
                    {saving === 'reopen' ? 'Saving...' : 'Reopen'}
                  </Button>
                </Box>
              </>
            )}

            {closed && (
              <Typography variant="body2" color="text.secondary">This incident is closed. Nothing left to do.</Typography>
            )}
          </Paper>

          <Paper variant="outlined" sx={{ p: 2 }}>
            <Typography variant="subtitle1">Notes</Typography>
            {closed ? (
              <Typography sx={{ whiteSpace: 'pre-wrap', mt: 1 }} color={incident.notes ? 'text.primary' : 'text.secondary'}>
                {incident.notes ?? 'No notes.'}
              </Typography>
            ) : (
              <>
                <Typography variant="caption" color="text.secondary">
                  What&apos;s been tried, who&apos;s been contacted, what&apos;s next.
                </Typography>
                <TextField
                  fullWidth
                  multiline
                  minRows={3}
                  size="small"
                  sx={{ mt: 1 }}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
                <Button
                  variant="outlined"
                  size="small"
                  fullWidth
                  sx={{ mt: 1 }}
                  disabled={busy || notes === (incident.notes ?? '')}
                  onClick={() => run('notes')}
                >
                  {saving === 'notes' ? 'Saving...' : 'Save notes'}
                </Button>
              </>
            )}
          </Paper>

          <Paper variant="outlined" sx={{ p: 2 }}>
            <Typography variant="subtitle1" sx={{ mb: 1 }}>History</Typography>
            <Typography variant="body2">
              Created by {incident.creator ? `${incident.creator.firstName} ${incident.creator.lastName}` : '—'}
            </Typography>
            <Typography variant="body2" color="text.secondary">{new Date(incident.createdAt).toLocaleString()}</Typography>
            <Typography variant="body2" sx={{ mt: 1 }}>Resolved</Typography>
            <Typography variant="body2" color="text.secondary">
              {incident.resolvedAt ? new Date(incident.resolvedAt).toLocaleString() : 'Not resolved yet'}
            </Typography>
            <Typography variant="body2" sx={{ mt: 1 }}>Last updated</Typography>
            <Typography variant="body2" color="text.secondary">{new Date(incident.updatedAt).toLocaleString()}</Typography>
          </Paper>
        </Box>
      </Box>

      <Dialog open={confirmingClose} onClose={() => setConfirmingClose(false)}>
        <DialogTitle>Close this incident?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            A closed incident can&apos;t be reopened or edited. This can&apos;t be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmingClose(false)}>Cancel</Button>
          <Button variant="contained" onClick={() => run('close')}>Close incident</Button>
        </DialogActions>
      </Dialog>

      <IncidentFormDialog
        open={editing}
        token={token}
        incident={incident}
        onClose={() => setEditing(false)}
        onSaved={(saved) => {
          setEditing(false);
          // The PUT response has the same relations as the detail fetch, but
          // keep any unsaved notes the user was typing.
          setIncident(saved);
        }}
      />
    </Box>
  );
}
