// Phase 12

// WHAT THIS FILE IS:
// @Audit(...) - put it on a controller route to have that route recorded in
// audit_logs automatically after it succeeds. It only attaches settings to
// the route; AuditInterceptor reads them and writes the row.
//
//   @Post()
//   @Audit({ action: AuditAction.ORDER_PLACED, entityType: AuditEntityType.ORDER,
//            describe: ({ data }) => `Placed order ${shortId(data)}` })
//   placeOrder() { ... }

import { SetMetadata } from '@nestjs/common';
import { AuditAction, AuditEntityType } from './entities/audit-log.entity';

export const AUDIT_KEY = 'audit';

// What the interceptor hands to the functions below, taken from the finished
// request. `data` is the `data` object the route returned.
export interface AuditContext {
  data: Record<string, unknown>;
  params: Record<string, string>;
  body: Record<string, unknown>;
  userId: string | null;
}

export interface AuditOptions {
  // A function can decide per request - returning null means "don't record
  // this one" (e.g. an incident status change that isn't a resolve).
  action: AuditAction | ((ctx: AuditContext) => AuditAction | null);
  entityType: AuditEntityType;
  describe: (ctx: AuditContext) => string;
  // Defaults to data.id, then the :id route param.
  entityId?: (ctx: AuditContext) => string | null;
  // Defaults to the logged-in user. Login is the exception - nobody is
  // logged in yet, so it takes the user from the response.
  actorId?: (ctx: AuditContext) => string | null;
}

export const Audit = (options: AuditOptions) => SetMetadata(AUDIT_KEY, options);

// ---- Small helpers for writing `describe` functions without `any` ----

// A string field of an object, or '' if it's missing/not a string.
export function field(obj: Record<string, unknown>, key: string): string {
  const value = obj[key];
  return typeof value === 'string' || typeof value === 'number'
    ? String(value)
    : '';
}

// A nested object field, or {} if it's missing.
export function child(
  obj: Record<string, unknown>,
  key: string,
): Record<string, unknown> {
  const value = obj[key];
  return typeof value === 'object' && value !== null
    ? (value as Record<string, unknown>)
    : {};
}

// "#1a2b3c4d" - the short number the website shows for an ID.
export function shortId(id: string): string {
  return id ? `#${id.slice(0, 8)}` : '';
}

export function money(value: string): string {
  return value ? `$${Number(value).toFixed(2)}` : '';
}
