'use client';

// Phase 7

// WHAT THIS FILE IS:
// The conversation half of a ticket, shared by the customer's and the
// agent's Ticket Details pages: the original complaint at the top, every
// message below it oldest first (the backend guarantees that order), and a
// reply box at the bottom. Messages from the person viewing sit on the
// right, everyone else's on the left - like any chat app.
//
// It doesn't call the API itself - the page passes in onReply, since
// customers and agents reply through different endpoints.

import { useState } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Paper from '@mui/material/Paper';
import Alert from '@mui/material/Alert';
import { SupportTicket, TicketStatus } from '@/types/support';

interface TicketConversationProps {
  ticket: SupportTicket;
  currentUserId: string;
  onReply: (message: string) => Promise<void>;
}

export default function TicketConversation({ ticket, currentUserId, onReply }: TicketConversationProps) {
  const [reply, setReply] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  const isClosed = ticket.status === TicketStatus.CLOSED;
  const customerName = ticket.customer
    ? `${ticket.customer.firstName} ${ticket.customer.lastName}`
    : 'Customer';

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!reply.trim()) return;
    setError('');
    setSending(true);
    try {
      await onReply(reply.trim());
      setReply('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send reply');
    } finally {
      setSending(false);
    }
  }

  return (
    <Box>
      <Typography variant="h6" sx={{ mb: 2 }}>Conversation</Typography>

      {/* The original complaint - stored on the ticket itself (description),
          not as a message, so it's rendered separately at the top. */}
      <MessageBubble
        author={customerName}
        text={ticket.description}
        timestamp={ticket.createdAt}
        isOwn={ticket.customerId === currentUserId}
        label="Original complaint"
      />

      {(ticket.messages ?? []).map((message) => (
        <MessageBubble
          key={message.id}
          author={message.sender ? `${message.sender.firstName} ${message.sender.lastName}` : 'Unknown'}
          text={message.message}
          timestamp={message.createdAt}
          isOwn={message.senderId === currentUserId}
          label={message.senderId === ticket.customerId ? undefined : 'Support'}
        />
      ))}

      {isClosed ? (
        <Alert severity="info" sx={{ mt: 3 }}>
          This ticket is closed. Replies are disabled.
        </Alert>
      ) : (
        <Box component="form" onSubmit={handleSubmit} sx={{ mt: 3 }}>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          <TextField
            label="Write a reply"
            fullWidth
            multiline
            minRows={3}
            value={reply}
            onChange={(e) => setReply(e.target.value)}
          />
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 1 }}>
            <Button type="submit" variant="contained" disabled={sending || !reply.trim()}>
              {sending ? 'Sending...' : 'Send Reply'}
            </Button>
          </Box>
        </Box>
      )}
    </Box>
  );
}

interface MessageBubbleProps {
  author: string;
  text: string;
  timestamp: string;
  isOwn: boolean;
  label?: string;
}

function MessageBubble({ author, text, timestamp, isOwn, label }: MessageBubbleProps) {
  return (
    <Box sx={{ display: 'flex', justifyContent: isOwn ? 'flex-end' : 'flex-start', mb: 2 }}>
      <Paper
        variant="outlined"
        sx={{
          p: 2,
          maxWidth: '75%',
          bgcolor: isOwn ? 'action.selected' : 'background.paper',
          borderColor: isOwn ? 'primary.light' : 'divider',
        }}
      >
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
          {author}
          {label && ` · ${label}`}
          {' · '}
          {new Date(timestamp).toLocaleString()}
        </Typography>
        <Typography sx={{ whiteSpace: 'pre-wrap' }}>{text}</Typography>
      </Paper>
    </Box>
  );
}
