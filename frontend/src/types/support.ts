// Phase 7

// WHAT THIS FILE IS:
// Type definitions for support tickets and their messages, mirroring the
// backend's SupportTicketEntity and SupportTicketMessageEntity
// (api/src/support/entities/). Which nested objects come back depends on
// the endpoint - e.g. the ticket list includes `order` but not `messages` -
// so those fields are optional here.

import { Order } from './order';
import { ReturnRequest } from './returns';
import { User } from './user';

export enum TicketCategory {
  DELAYED_SHIPMENT = 'DELAYED_SHIPMENT',
  WRONG_ITEM = 'WRONG_ITEM',
  DAMAGED_ITEM = 'DAMAGED_ITEM',
  MISSING_PACKAGE = 'MISSING_PACKAGE',
  OTHER = 'OTHER',
}

export enum TicketPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  URGENT = 'URGENT',
}

export enum TicketStatus {
  OPEN = 'OPEN',
  IN_PROGRESS = 'IN_PROGRESS',
  WAITING_FOR_CUSTOMER = 'WAITING_FOR_CUSTOMER',
  RESOLVED = 'RESOLVED',
  CLOSED = 'CLOSED',
}

// Human-readable labels, shared by every support screen so a category or
// status reads the same everywhere.
export const CATEGORY_LABELS: Record<TicketCategory, string> = {
  [TicketCategory.DELAYED_SHIPMENT]: 'Delayed shipment',
  [TicketCategory.WRONG_ITEM]: 'Wrong item received',
  [TicketCategory.DAMAGED_ITEM]: 'Damaged item',
  [TicketCategory.MISSING_PACKAGE]: 'Missing package',
  [TicketCategory.OTHER]: 'Other',
};

export const STATUS_LABELS: Record<TicketStatus, string> = {
  [TicketStatus.OPEN]: 'Open',
  [TicketStatus.IN_PROGRESS]: 'In progress',
  [TicketStatus.WAITING_FOR_CUSTOMER]: 'Waiting for customer',
  [TicketStatus.RESOLVED]: 'Resolved',
  [TicketStatus.CLOSED]: 'Closed',
};

export const STATUS_COLORS: Record<TicketStatus, 'default' | 'info' | 'warning' | 'success' | 'error'> = {
  [TicketStatus.OPEN]: 'error',
  [TicketStatus.IN_PROGRESS]: 'info',
  [TicketStatus.WAITING_FOR_CUSTOMER]: 'warning',
  [TicketStatus.RESOLVED]: 'success',
  [TicketStatus.CLOSED]: 'default',
};

export const PRIORITY_COLORS: Record<TicketPriority, 'default' | 'info' | 'warning' | 'error'> = {
  [TicketPriority.LOW]: 'default',
  [TicketPriority.MEDIUM]: 'info',
  [TicketPriority.HIGH]: 'warning',
  [TicketPriority.URGENT]: 'error',
};

export interface TicketMessage {
  id: string;
  ticketId: string;
  senderId: string;
  sender?: User;
  message: string;
  createdAt: string;
}

export interface SupportTicket {
  id: string;
  customerId: string;
  customer?: User;
  orderId: string | null;
  order?: Order | null;
  assignedAgentId: string | null;
  assignedAgent?: User | null;
  category: TicketCategory;
  subject: string;
  description: string;
  priority: TicketPriority;
  status: TicketStatus;
  messages?: TicketMessage[];
  createdAt: string;
  updatedAt: string;
  closedAt: string | null;
}

export interface CreateTicketInput {
  category: TicketCategory;
  subject: string;
  description: string;
  orderId?: string;
}

// What GET /api/support/customers/:id returns - everything an agent needs
// to know about a customer while handling their ticket.
export interface CustomerContext {
  profile: User;
  orders: Order[];
  tickets: SupportTicket[];
  returns: ReturnRequest[];
}
