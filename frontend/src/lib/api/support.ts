// Phase 7

// WHAT THIS FILE IS:
// The API client for support tickets - the customer-facing routes
// (/api/support/tickets/...), the agent-facing ones
// (/api/support/agent/tickets/...), customer lookup
// (/api/support/customers/...), and the agent list (/api/support/agents).

import {
  CreateTicketInput,
  CustomerContext,
  SupportTicket,
  TicketMessage,
  TicketStatus,
} from '@/types/support';
import { User } from '@/types/user';
import { API_URL } from './config';

function authHeaders(token: string): HeadersInit {
  return { Authorization: `Bearer ${token}` };
}

function jsonHeaders(token: string): HeadersInit {
  return { 'Content-Type': 'application/json', ...authHeaders(token) };
}

// Every route here returns { data: T } on success and { message } on
// failure - this unwraps the one and throws the other.
async function unwrap<T>(res: Response, fallbackError: string): Promise<T> {
  const json = await res.json();
  if (!res.ok) throw new Error(json.message ?? fallbackError);
  return json.data as T;
}

// ---- Customer ----

export async function createTicket(token: string, input: CreateTicketInput): Promise<SupportTicket> {
  const res = await fetch(`${API_URL}/support/tickets`, {
    method: 'POST',
    headers: jsonHeaders(token),
    body: JSON.stringify(input),
  });
  return unwrap(res, 'Failed to submit ticket');
}

export async function getMyTickets(token: string): Promise<SupportTicket[]> {
  const res = await fetch(`${API_URL}/support/tickets/me`, { headers: authHeaders(token) });
  return unwrap(res, 'Failed to fetch tickets');
}

export async function getMyTicket(token: string, id: string): Promise<SupportTicket> {
  const res = await fetch(`${API_URL}/support/tickets/me/${id}`, { headers: authHeaders(token) });
  return unwrap(res, 'Failed to fetch ticket');
}

export async function replyAsCustomer(token: string, id: string, message: string): Promise<TicketMessage> {
  const res = await fetch(`${API_URL}/support/tickets/${id}/messages`, {
    method: 'POST',
    headers: jsonHeaders(token),
    body: JSON.stringify({ message }),
  });
  return unwrap(res, 'Failed to send reply');
}

// ---- Agent ----

export async function getTicketQueue(
  token: string,
  filters: { status?: TicketStatus; assignedToMe?: boolean } = {},
): Promise<SupportTicket[]> {
  const params = new URLSearchParams();
  if (filters.status) params.set('status', filters.status);
  if (filters.assignedToMe) params.set('assignedToMe', 'true');
  const query = params.toString();
  const res = await fetch(`${API_URL}/support/agent/tickets${query ? `?${query}` : ''}`, {
    headers: authHeaders(token),
  });
  return unwrap(res, 'Failed to fetch ticket queue');
}

export async function getAgentTicket(token: string, id: string): Promise<SupportTicket> {
  const res = await fetch(`${API_URL}/support/agent/tickets/${id}`, { headers: authHeaders(token) });
  return unwrap(res, 'Failed to fetch ticket');
}

export async function replyAsAgent(token: string, id: string, message: string): Promise<TicketMessage> {
  const res = await fetch(`${API_URL}/support/agent/tickets/${id}/messages`, {
    method: 'POST',
    headers: jsonHeaders(token),
    body: JSON.stringify({ message }),
  });
  return unwrap(res, 'Failed to send reply');
}

export async function assignTicket(token: string, id: string, agentId: string): Promise<SupportTicket> {
  const res = await fetch(`${API_URL}/support/agent/tickets/${id}/assign`, {
    method: 'PATCH',
    headers: jsonHeaders(token),
    body: JSON.stringify({ agentId }),
  });
  return unwrap(res, 'Failed to assign ticket');
}

export async function updateTicketStatus(
  token: string,
  id: string,
  status: TicketStatus,
): Promise<SupportTicket> {
  const res = await fetch(`${API_URL}/support/agent/tickets/${id}/status`, {
    method: 'PATCH',
    headers: jsonHeaders(token),
    body: JSON.stringify({ status }),
  });
  return unwrap(res, 'Failed to update status');
}

export async function getSupportAgents(token: string): Promise<User[]> {
  const res = await fetch(`${API_URL}/support/agents`, { headers: authHeaders(token) });
  return unwrap(res, 'Failed to fetch support agents');
}

// ---- Customer lookup ----

export async function searchCustomers(token: string, query: string): Promise<User[]> {
  const res = await fetch(`${API_URL}/support/customers/search?q=${encodeURIComponent(query)}`, {
    headers: authHeaders(token),
  });
  return unwrap(res, 'Failed to search customers');
}

export async function getCustomerContext(token: string, id: string): Promise<CustomerContext> {
  const res = await fetch(`${API_URL}/support/customers/${id}`, { headers: authHeaders(token) });
  return unwrap(res, 'Failed to fetch customer');
}
