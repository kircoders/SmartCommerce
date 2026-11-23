// Phase 12

// WHAT THIS FILE IS:
// Types for the admin Audit Logs page - matches GET /api/admin/audit-logs.

import { UserRole } from './user';

export enum AuditAction {
  LOGIN = 'LOGIN',
  LOGOUT = 'LOGOUT',
  PRODUCT_CREATED = 'PRODUCT_CREATED',
  PRODUCT_UPDATED = 'PRODUCT_UPDATED',
  PRODUCT_DELETED = 'PRODUCT_DELETED',
  INVENTORY_ADJUSTED = 'INVENTORY_ADJUSTED',
  ORDER_PLACED = 'ORDER_PLACED',
  ORDER_CANCELLED = 'ORDER_CANCELLED',
  SHIPMENT_STATUS_UPDATED = 'SHIPMENT_STATUS_UPDATED',
  SHIPMENT_TRACKING_UPDATED = 'SHIPMENT_TRACKING_UPDATED',
  TICKET_CREATED = 'TICKET_CREATED',
  RETURN_REQUESTED = 'RETURN_REQUESTED',
  REFUND_PROCESSED = 'REFUND_PROCESSED',
  INCIDENT_CREATED = 'INCIDENT_CREATED',
  INCIDENT_RESOLVED = 'INCIDENT_RESOLVED',
}

export enum AuditEntityType {
  USER = 'USER',
  PRODUCT = 'PRODUCT',
  ORDER = 'ORDER',
  SHIPMENT = 'SHIPMENT',
  SUPPORT_TICKET = 'SUPPORT_TICKET',
  RETURN = 'RETURN',
  REFUND = 'REFUND',
  INCIDENT = 'INCIDENT',
}

export interface AuditLog {
  id: string;
  userId: string;
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: UserRole;
  };
  action: AuditAction;
  entityType: AuditEntityType;
  entityId: string | null;
  description: string;
  createdAt: string;
}

export interface AuditLogFilters {
  q?: string;
  action?: AuditAction;
  entityType?: AuditEntityType;
  from?: string; // ISO date/time
  to?: string; // ISO date/time
  page?: number;
  pageSize?: number;
}

export interface AuditLogPage {
  items: AuditLog[];
  total: number;
  page: number;
  pageSize: number;
}
