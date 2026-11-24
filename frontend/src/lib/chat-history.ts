// Phase 12

// WHAT THIS FILE IS:
// Saves the customer's AI chat in the browser (localStorage) so it survives
// a page refresh. Nothing is stored on the server.
//
// - One key per user ("aiChat:<userId>"), so logging in as someone else on
//   the same browser never shows the previous person's chat.
// - clearAllChatHistory() runs on logout (see useAuth.clearAuth), so a
//   shared computer doesn't keep anyone's chat around.
// - Only the newest MAX_SAVED_TURNS turns are kept, so storage can't grow
//   forever.

import { ChatTurn } from '@/types/ai';

const KEY_PREFIX = 'aiChat:';
const MAX_SAVED_TURNS = 50;

function keyFor(userId: string): string {
  return `${KEY_PREFIX}${userId}`;
}

function isChatTurn(value: unknown): value is ChatTurn {
  if (typeof value !== 'object' || value === null) return false;
  const turn = value as Record<string, unknown>;
  return (
    (turn.role === 'user' || turn.role === 'assistant') &&
    typeof turn.content === 'string'
  );
}

export function loadChatHistory(userId: string): ChatTurn[] {
  try {
    const raw = localStorage.getItem(keyFor(userId));
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    // Anything that doesn't look like a chat (old format, hand-edited) is
    // ignored rather than crashing the page.
    return Array.isArray(parsed) ? parsed.filter(isChatTurn) : [];
  } catch {
    return [];
  }
}

export function saveChatHistory(userId: string, turns: ChatTurn[]): void {
  try {
    if (turns.length === 0) {
      localStorage.removeItem(keyFor(userId));
    } else {
      localStorage.setItem(keyFor(userId), JSON.stringify(turns.slice(-MAX_SAVED_TURNS)));
    }
  } catch {
    // Storage full or blocked (private window) - the chat still works, it
    // just won't survive a refresh.
  }
}

export function clearAllChatHistory(): void {
  try {
    Object.keys(localStorage)
      .filter((key) => key.startsWith(KEY_PREFIX))
      .forEach((key) => localStorage.removeItem(key));
  } catch {
    // Storage blocked - nothing was saved anyway.
  }
}
