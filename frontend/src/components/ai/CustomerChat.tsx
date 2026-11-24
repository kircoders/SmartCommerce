'use client';

// Phase 11

// WHAT THIS FILE IS:
// The customer's AI chat box on the Support page. Each question is sent to
// POST /api/ai/customer/chat together with the conversation so far (the
// server doesn't store chats), and the reply is added to the list.
//
// Phase 12: the chat is saved in the browser (lib/chat-history.ts), so a
// refresh keeps it. "Clear chat" starts over; logging out deletes it.

import { useEffect, useRef, useState } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Paper from '@mui/material/Paper';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import { customerChat } from '@/lib/api/ai';
import { loadChatHistory, saveChatHistory } from '@/lib/chat-history';
import { ChatTurn, MAX_CHAT_HISTORY, MAX_CHAT_MESSAGE_LENGTH } from '@/types/ai';

const GREETING =
  "Hi! I'm the SmartCommerce assistant. Ask me about your orders, shipments, returns, refunds, or support tickets.";

interface CustomerChatProps {
  token: string;
  userId: string;
}

export default function CustomerChat({ token, userId }: CustomerChatProps) {
  // Start from the saved chat. Reading localStorage here is safe: this
  // component only renders after login, which only happens in the browser.
  // The Support page gives it key={userId}, so a different user gets a
  // fresh component (and their own saved chat).
  const [turns, setTurns] = useState<ChatTurn[]>(() => loadChatHistory(userId));
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const listRef = useRef<HTMLDivElement>(null);

  // Save after every change.
  useEffect(() => {
    saveChatHistory(userId, turns);
  }, [turns, userId]);

  function clearChat() {
    setTurns([]);
    setError('');
  }

  // Keep the newest message in view.
  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
  }, [turns, sending]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const message = input.trim();
    if (!message || sending) return;

    // The greeting is only shown on screen, never sent. Only the most
    // recent turns go back as history (the backend accepts up to 20).
    const history = turns.slice(-MAX_CHAT_HISTORY);
    setTurns([...turns, { role: 'user', content: message }]);
    setInput('');
    setError('');
    setSending(true);
    try {
      const reply = await customerChat(token, message, history);
      setTurns((current) => [...current, { role: 'assistant', content: reply }]);
    } catch (err) {
      // Take the unanswered question back out so it isn't sent as history.
      setTurns((current) => current.slice(0, -1));
      setInput(message);
      setError(err instanceof Error ? err.message : 'The assistant could not answer right now');
    } finally {
      setSending(false);
    }
  }

  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h6">Ask the AI assistant</Typography>
        {turns.length > 0 && (
          <Button size="small" onClick={clearChat} disabled={sending}>
            Clear chat
          </Button>
        )}
      </Box>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Answers come from your own account. The assistant can&apos;t make changes - for that, contact support.
      </Typography>

      <Box ref={listRef} sx={{ maxHeight: 360, overflowY: 'auto', mb: 2, pr: 1 }}>
        <ChatBubble role="assistant" text={GREETING} />
        {turns.map((turn, i) => (
          <ChatBubble key={i} role={turn.role} text={turn.content} />
        ))}
        {sending && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'text.secondary', my: 1 }}>
            <CircularProgress size={16} />
            <Typography variant="body2">Thinking...</Typography>
          </Box>
        )}
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
        <TextField
          placeholder="e.g. Has my last order shipped?"
          fullWidth
          size="small"
          multiline
          maxRows={4}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            // Enter sends, Shift+Enter makes a new line.
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              e.currentTarget.closest('form')?.requestSubmit();
            }
          }}
          slotProps={{ htmlInput: { maxLength: MAX_CHAT_MESSAGE_LENGTH } }}
        />
        <Button type="submit" variant="contained" disabled={sending || !input.trim()}>
          Send
        </Button>
      </Box>
    </Paper>
  );
}

function ChatBubble({ role, text }: { role: ChatTurn['role']; text: string }) {
  const isUser = role === 'user';
  return (
    <Box sx={{ display: 'flex', justifyContent: isUser ? 'flex-end' : 'flex-start', my: 1 }}>
      <Box
        sx={{
          maxWidth: '80%',
          px: 1.5,
          py: 1,
          borderRadius: 2,
          bgcolor: isUser ? 'primary.main' : 'grey.100',
          color: isUser ? 'primary.contrastText' : 'text.primary',
          whiteSpace: 'pre-wrap',
        }}
      >
        <Typography variant="body2">{text}</Typography>
      </Box>
    </Box>
  );
}
