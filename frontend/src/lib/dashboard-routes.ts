// Phase 7

// WHAT THIS FILE IS:
// Each role's home dashboard - where a page sends a user whose role isn't
// allowed there. Mirrors the backend's ROLE_REDIRECT (auth.service.ts).
// (cart, checkout, inventory, orders, and order-confirmation each still
// keep their own copy of this map from before it was shared.)

import { UserRole } from '@/types/user';

export const DASHBOARD_ROUTES: Record<UserRole, string> = {
  [UserRole.CUSTOMER]: '/dashboard/customer',
  [UserRole.SUPPORT_AGENT]: '/dashboard/support',
  [UserRole.WAREHOUSE_OPERATOR]: '/dashboard/warehouse',
  [UserRole.OPERATIONS_MANAGER]: '/dashboard/operations',
  [UserRole.ADMIN]: '/dashboard/admin',
};

// Roles allowed into the support agent screens - matches the backend's
// @Roles on the support agent, customer lookup, and staff controllers.
export const SUPPORT_STAFF_ROLES: UserRole[] = [
  UserRole.SUPPORT_AGENT,
  UserRole.OPERATIONS_MANAGER,
  UserRole.ADMIN,
];
