// Phase 11

// WHAT THIS FILE IS:
// The API client for the AI assistant (/api/ai/...):
//   - customerChat:     the customer's chat box on the Support page
//   - summarizeTicket, suggestTicketResponse, explainTicket: the staff
//     tools on the agent's Ticket Details page
// Every call runs the model on the backend, so each takes a few seconds.

import { ChatTurn } from '@/types/ai';
import { API_URL } from './config';

function jsonHeaders(token: string): HeadersInit {
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
}

// Same { data } / { message } convention as every other route.
async function unwrap<T>(res: Response, fallbackError: string): Promise<T> {
  const json = await res.json();
  if (!res.ok) throw new Error(json.message ?? fallbackError);
  return json.data as T;
}

// ---- Customer ----

export async function customerChat(token: string, message: string, history: ChatTurn[]): Promise<string> {
  const res = await fetch(`${API_URL}/ai/customer/chat`, {
    method: 'POST',
    headers: jsonHeaders(token),
    body: JSON.stringify({ message, history }),
  });
  const data = await unwrap<{ reply: string }>(res, 'The assistant could not answer right now');
  return data.reply;
}

// ---- Support staff ----

export async function summarizeTicket(token: string, ticketId: string): Promise<string> {
  const res = await fetch(`${API_URL}/ai/support/tickets/${ticketId}/summary`, {
    method: 'POST',
    headers: jsonHeaders(token),
  });
  const data = await unwrap<{ summary: string }>(res, 'Failed to summarize ticket');
  return data.summary;
}

export async function suggestTicketResponse(token: string, ticketId: string): Promise<string> {
  const res = await fetch(`${API_URL}/ai/support/tickets/${ticketId}/suggest-response`, {
    method: 'POST',
    headers: jsonHeaders(token),
  });
  const data = await unwrap<{ draft: string }>(res, 'Failed to suggest a response');
  return data.draft;
}

// No question = "explain this issue"; with one, the AI answers it.
export async function explainTicket(token: string, ticketId: string, question?: string): Promise<string> {
  const res = await fetch(`${API_URL}/ai/support/assist`, {
    method: 'POST',
    headers: jsonHeaders(token),
    body: JSON.stringify(question ? { ticketId, question } : { ticketId }),
  });
  const data = await unwrap<{ answer: string }>(res, 'Failed to explain ticket');
  return data.answer;
}
