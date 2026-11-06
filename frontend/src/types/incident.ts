// Phase 9

// WHAT THIS FILE IS:
// Type definitions for incidents, mirroring the backend's IncidentEntity
// (api/src/incidents/entities/incident.entity.ts), plus the labels and
// colors the incident screens share. The list endpoint only includes the
// creator; the detail endpoint also includes the linked order and shipment.

import { Order } from './order';
import { Shipment } from './shipment';
import { User } from './user';

export enum IncidentType {
  SHIPMENT_DELAY = 'SHIPMENT_DELAY',
  INVENTORY_ISSUE = 'INVENTORY_ISSUE',
  WAREHOUSE_ISSUE = 'WAREHOUSE_ISSUE',
  CUSTOMER_ESCALATION = 'CUSTOMER_ESCALATION',
  SYSTEM_ISSUE = 'SYSTEM_ISSUE',
  OTHER = 'OTHER',
}

export enum IncidentSeverity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

export enum IncidentStatus {
  OPEN = 'OPEN',
  IN_PROGRESS = 'IN_PROGRESS',
  RESOLVED = 'RESOLVED',
  CLOSED = 'CLOSED',
}

export const INCIDENT_TYPE_LABELS: Record<IncidentType, string> = {
  [IncidentType.SHIPMENT_DELAY]: 'Shipment Delay',
  [IncidentType.INVENTORY_ISSUE]: 'Inventory Issue',
  [IncidentType.WAREHOUSE_ISSUE]: 'Warehouse Issue',
  [IncidentType.CUSTOMER_ESCALATION]: 'Customer Escalation',
  [IncidentType.SYSTEM_ISSUE]: 'System Issue',
  [IncidentType.OTHER]: 'Other',
};

export const SEVERITY_LABELS: Record<IncidentSeverity, string> = {
  [IncidentSeverity.LOW]: 'Low',
  [IncidentSeverity.MEDIUM]: 'Medium',
  [IncidentSeverity.HIGH]: 'High',
  [IncidentSeverity.CRITICAL]: 'Critical',
};

export const SEVERITY_COLORS: Record<IncidentSeverity, 'default' | 'info' | 'warning' | 'error'> = {
  [IncidentSeverity.LOW]: 'default',
  [IncidentSeverity.MEDIUM]: 'info',
  [IncidentSeverity.HIGH]: 'warning',
  [IncidentSeverity.CRITICAL]: 'error',
};

export const INCIDENT_STATUS_LABELS: Record<IncidentStatus, string> = {
  [IncidentStatus.OPEN]: 'Open',
  [IncidentStatus.IN_PROGRESS]: 'In Progress',
  [IncidentStatus.RESOLVED]: 'Resolved',
  [IncidentStatus.CLOSED]: 'Closed',
};

export const INCIDENT_STATUS_COLORS: Record<IncidentStatus, 'default' | 'info' | 'warning' | 'success'> = {
  [IncidentStatus.OPEN]: 'warning',
  [IncidentStatus.IN_PROGRESS]: 'info',
  [IncidentStatus.RESOLVED]: 'success',
  [IncidentStatus.CLOSED]: 'default',
};

export interface Incident {
  id: string;
  createdBy: string;
  creator?: User;
  orderId: string | null;
  order?: Order | null;
  shipmentId: string | null;
  shipment?: Shipment | null;
  type: IncidentType;
  severity: IncidentSeverity;
  status: IncidentStatus;
  title: string;
  description: string;
  notes: string | null;
  resolvedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface IncidentSummary {
  open: number;
  critical: number;
  recentlyResolved: number;
}

export interface IncidentFilters {
  status?: IncidentStatus;
  // OPEN or IN_PROGRESS - what the dashboard's "Open" count means.
  unresolved?: boolean;
  severity?: IncidentSeverity;
  type?: IncidentType;
  q?: string;
}

export interface CreateIncidentInput {
  title: string;
  type: IncidentType;
  severity: IncidentSeverity;
  description: string;
  orderId?: string;
  shipmentId?: string;
  notes?: string;
}

export interface UpdateIncidentInput {
  title?: string;
  type?: IncidentType;
  severity?: IncidentSeverity;
  description?: string;
  notes?: string;
}
