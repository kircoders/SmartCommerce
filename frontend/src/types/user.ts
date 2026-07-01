// WHAT THIS FILE IS:
// A TypeScript "type definition" file. It doesn't run any code, make any API calls,
// or display anything on screen. It simply describes what a User object looks like —
// what fields it has and what type each field is (string, boolean, etc).
//
// WHY IT EXISTS:
// Every other file that deals with user data (pages, hooks, API functions) imports
// from here. This means if the user structure ever changes, we only update it in
// one place instead of everywhere.
//
// WHAT'S IN IT:
// - UserRole: an enum listing all 5 possible roles a user can have
// - User: an interface describing every field that comes back from the backend

export enum UserRole {
  CUSTOMER = 'CUSTOMER',
  SUPPORT_AGENT = 'SUPPORT_AGENT',
  WAREHOUSE_OPERATOR = 'WAREHOUSE_OPERATOR',
  OPERATIONS_MANAGER = 'OPERATIONS_MANAGER',
  ADMIN = 'ADMIN',
}

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}
