'use client';

// Phase 9

// WHAT THIS FILE IS:
// The popup form for incidents, used two ways:
//   - Create (no `incident` prop): title, type, severity, description,
//     optional order/shipment IDs, and starting notes. The Incidents page
//     opens it empty; the shipment detail page opens it with the shipment
//     already filled in (`presetShipmentId`).
//   - Edit (`incident` passed): title, type, severity, description. Links
//     can't be changed after creating, and notes have their own box on the
//     details page.
// The backend checks that linked records exist and belong together; this
// form only checks the IDs look like IDs, so typos are caught before
// sending.

import { useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Alert from '@mui/material/Alert';
import MenuItem from '@mui/material/MenuItem';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import { createIncident, updateIncident } from '@/lib/api/incidents';
import {
  INCIDENT_TYPE_LABELS,
  Incident,
  IncidentSeverity,
  IncidentType,
  SEVERITY_LABELS,
} from '@/types/incident';

const TITLE_MAX = 200;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface IncidentFormDialogProps {
  open: boolean;
  token: string;
  onClose: () => void;
  onSaved: (incident: Incident) => void;
  incident?: Incident;
  presetShipmentId?: string;
}

// The form lives in its own component inside the Dialog. MUI unmounts a
// closed Dialog's contents, so every time it opens the form starts fresh
// from the props - a cancelled form never comes back half-filled.
export default function IncidentFormDialog(props: IncidentFormDialogProps) {
  return (
    <Dialog open={props.open} onClose={props.onClose} fullWidth maxWidth="sm">
      <IncidentForm {...props} />
    </Dialog>
  );
}

function IncidentForm({ token, onClose, onSaved, incident, presetShipmentId }: IncidentFormDialogProps) {
  const editing = incident !== undefined;

  const [title, setTitle] = useState(incident?.title ?? '');
  const [type, setType] = useState<IncidentType>(
    incident?.type ?? (presetShipmentId ? IncidentType.SHIPMENT_DELAY : IncidentType.OTHER),
  );
  const [severity, setSeverity] = useState<IncidentSeverity>(incident?.severity ?? IncidentSeverity.MEDIUM);
  const [description, setDescription] = useState(incident?.description ?? '');
  const [orderId, setOrderId] = useState('');
  const [shipmentId, setShipmentId] = useState(presetShipmentId ?? '');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const orderIdInvalid = orderId.trim() !== '' && !UUID_PATTERN.test(orderId.trim());
  const shipmentIdInvalid = shipmentId.trim() !== '' && !UUID_PATTERN.test(shipmentId.trim());
  const canSave = title.trim() !== '' && description.trim() !== '' && !orderIdInvalid && !shipmentIdInvalid;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSave) return;
    setError('');
    setSaving(true);
    try {
      const saved = editing
        ? await updateIncident(token, incident.id, {
            title: title.trim(),
            type,
            severity,
            description: description.trim(),
          })
        : await createIncident(token, {
            title: title.trim(),
            type,
            severity,
            description: description.trim(),
            orderId: orderId.trim() || undefined,
            shipmentId: shipmentId.trim() || undefined,
            notes: notes.trim() || undefined,
          });
      onSaved(saved);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save incident');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Box component="form" onSubmit={handleSubmit}>
      <DialogTitle>{editing ? 'Edit incident' : 'New incident'}</DialogTitle>
      <DialogContent>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        <TextField
          label="Title"
          fullWidth
          margin="normal"
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          slotProps={{ htmlInput: { maxLength: TITLE_MAX } }}
        />

        <Box sx={{ display: 'flex', gap: 2 }}>
          <TextField
            select
            label="Type"
            fullWidth
            margin="normal"
            value={type}
            onChange={(e) => setType(e.target.value as IncidentType)}
          >
            {Object.values(IncidentType).map((t) => (
              <MenuItem key={t} value={t}>{INCIDENT_TYPE_LABELS[t]}</MenuItem>
            ))}
          </TextField>
          <TextField
            select
            label="Severity"
            fullWidth
            margin="normal"
            value={severity}
            onChange={(e) => setSeverity(e.target.value as IncidentSeverity)}
          >
            {Object.values(IncidentSeverity).map((s) => (
              <MenuItem key={s} value={s}>{SEVERITY_LABELS[s]}</MenuItem>
            ))}
          </TextField>
        </Box>

        <TextField
          label="Description"
          fullWidth
          margin="normal"
          required
          multiline
          minRows={3}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />

        {!editing && (
          <>
            <TextField
              label="Related order ID (optional)"
              fullWidth
              margin="normal"
              value={orderId}
              onChange={(e) => setOrderId(e.target.value)}
              error={orderIdInvalid}
              helperText={orderIdInvalid ? "That doesn't look like an order ID" : ' '}
            />
            <TextField
              label="Related shipment ID (optional)"
              fullWidth
              margin="normal"
              value={shipmentId}
              onChange={(e) => setShipmentId(e.target.value)}
              error={shipmentIdInvalid}
              helperText={
                shipmentIdInvalid
                  ? "That doesn't look like a shipment ID"
                  : "The shipment's order is linked automatically"
              }
            />
            <TextField
              label="Notes (optional)"
              fullWidth
              margin="normal"
              multiline
              minRows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button type="submit" variant="contained" disabled={saving || !canSave}>
          {saving ? 'Saving...' : editing ? 'Save changes' : 'Create incident'}
        </Button>
      </DialogActions>
    </Box>
  );
}
