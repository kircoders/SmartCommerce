// Phase 8

// WHAT THIS FILE IS:
// Type definitions for returns and refunds, mirroring the backend's
// ReturnEntity, ReturnItemEntity, ReturnEvidenceEntity, and RefundEntity
// (api/src/returns/entities/). Which nested objects come back depends on
// the endpoint - e.g. the customer's list has items but no evidence, and
// only staff responses include internalNotes - so those are optional here.

import { Order, OrderItem } from './order';
import { User } from './user';

export enum ReturnStatus {
  REQUESTED = 'REQUESTED',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  RECEIVED = 'RECEIVED',
  REFUNDED = 'REFUNDED',
}

export enum RefundStatus {
  PENDING = 'PENDING',
  COMPLETED = 'COMPLETED',
}

// Customer-facing wording - what each status means from their side.
export const RETURN_STATUS_LABELS: Record<ReturnStatus, string> = {
  [ReturnStatus.REQUESTED]: 'Requested',
  [ReturnStatus.APPROVED]: 'Approved',
  [ReturnStatus.REJECTED]: 'Rejected',
  [ReturnStatus.RECEIVED]: 'Received',
  [ReturnStatus.REFUNDED]: 'Refunded',
};

export const RETURN_STATUS_COLORS: Record<ReturnStatus, 'default' | 'info' | 'warning' | 'success' | 'error'> = {
  [ReturnStatus.REQUESTED]: 'warning',
  [ReturnStatus.APPROVED]: 'info',
  [ReturnStatus.REJECTED]: 'error',
  [ReturnStatus.RECEIVED]: 'info',
  [ReturnStatus.REFUNDED]: 'success',
};

// What the customer should expect next at each status.
export const RETURN_STATUS_HELP: Record<ReturnStatus, string> = {
  [ReturnStatus.REQUESTED]: 'Our team is reviewing your request.',
  [ReturnStatus.APPROVED]: 'Approved - please send the items back to us.',
  [ReturnStatus.REJECTED]: 'This return was not approved.',
  [ReturnStatus.RECEIVED]: "We've received your items. Your refund is being processed.",
  [ReturnStatus.REFUNDED]: 'Your refund has been issued.',
};

export interface ReturnItem {
  id: string;
  returnId: string;
  orderItemId: string;
  orderItem?: OrderItem;
  quantity: number;
  conditionNotes: string | null;
  createdAt: string;
}

export interface ReturnEvidence {
  id: string;
  returnId: string;
  // A signed link that stops working after ~15 minutes - re-fetch the
  // return to get a fresh one.
  url?: string;
  createdAt: string;
}

export interface Refund {
  id: string;
  returnId: string;
  orderId: string;
  amount: string;
  status: RefundStatus;
  processedBy: string | null;
  processor?: User | null;
  processedAt: string | null;
  createdAt: string;
}

export interface ReturnRequest {
  id: string;
  orderId: string;
  order?: Order;
  customerId: string;
  customer?: User;
  reason: string;
  status: ReturnStatus;
  internalNotes?: string | null;
  requestedAt: string;
  reviewedBy: string | null;
  reviewer?: User | null;
  reviewedAt: string | null;
  items?: ReturnItem[];
  evidence?: ReturnEvidence[];
  refund?: Refund | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateReturnInput {
  orderId: string;
  reason: string;
  items: { orderItemId: string; quantity: number; conditionNotes?: string }[];
}

// The statuses staff can set by hand. REFUNDED only happens by issuing a
// refund, so it's never offered as a plain status change.
export type StaffReturnStatus = ReturnStatus.APPROVED | ReturnStatus.REJECTED | ReturnStatus.RECEIVED;
