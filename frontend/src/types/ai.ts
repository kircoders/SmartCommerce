// Phase 11

// One turn of the customer AI chat. The backend doesn't store chats, so the
// page keeps these and sends them back as `history` with each new question.
export interface ChatTurn {
  role: 'user' | 'assistant';
  content: string;
}

// Matches the backend's limits (CustomerChatDto).
export const MAX_CHAT_MESSAGE_LENGTH = 2000;
export const MAX_CHAT_HISTORY = 20;
