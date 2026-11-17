'use client';

// Phase 11

// WHAT THIS FILE IS:
// The "AI Assistant" box on the agent's Ticket Details page. Three tools:
//   - Summarize:         a short recap of the ticket
//   - Suggest response:  a draft reply - "Use as reply" copies it into the
//                        reply box, where the agent edits it and sends it
//                        themselves (the AI never sends anything)
//   - Explain issue:     what's wrong and what to check next, or the answer
//                        to the agent's own question if they type one
// Only the latest result is shown.

import { useState } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Paper from '@mui/material/Paper';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import { explainTicket, suggestTicketResponse, summarizeTicket } from '@/lib/api/ai';

type Tool = 'summary' | 'draft' | 'explain';

const RESULT_TITLES: Record<Tool, string> = {
  summary: 'Summary',
  draft: 'Suggested response (draft)',
  explain: 'Explanation',
};

interface TicketAiPanelProps {
  token: string;
  ticketId: string;
  // False when the ticket is closed - there's no reply box to fill.
  canReply: boolean;
  onUseDraft: (text: string) => void;
}

export default function TicketAiPanel({ token, ticketId, canReply, onUseDraft }: TicketAiPanelProps) {
  const [running, setRunning] = useState<Tool | null>(null);
  const [result, setResult] = useState<{ tool: Tool; text: string } | null>(null);
  const [question, setQuestion] = useState('');
  const [error, setError] = useState('');

  async function run(tool: Tool) {
    setError('');
    setRunning(tool);
    try {
      const text =
        tool === 'summary'
          ? await summarizeTicket(token, ticketId)
          : tool === 'draft'
            ? await suggestTicketResponse(token, ticketId)
            : await explainTicket(token, ticketId, question.trim() || undefined);
      setResult({ tool, text });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'The AI assistant is unavailable right now');
    } finally {
      setRunning(null);
    }
  }

  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Typography variant="subtitle1">AI Assistant</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
        AI can make mistakes - check it against the ticket before acting.
      </Typography>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        <Button variant="outlined" size="small" disabled={running !== null} onClick={() => run('summary')}>
          {running === 'summary' ? 'Summarizing...' : 'Summarize'}
        </Button>
        <Button variant="outlined" size="small" disabled={running !== null} onClick={() => run('draft')}>
          {running === 'draft' ? 'Writing draft...' : 'Suggest response'}
        </Button>
        <TextField
          size="small"
          placeholder="Optional question, e.g. Was the reship sent?"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          slotProps={{ htmlInput: { maxLength: 1000 } }}
        />
        <Button variant="outlined" size="small" disabled={running !== null} onClick={() => run('explain')}>
          {running === 'explain' ? 'Thinking...' : question.trim() ? 'Ask' : 'Explain issue'}
        </Button>
      </Box>

      {running && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
          <CircularProgress size={24} />
        </Box>
      )}

      {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}

      {result && !running && (
        <Box sx={{ mt: 2, p: 1.5, bgcolor: 'grey.50', borderRadius: 1 }}>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>{RESULT_TITLES[result.tool]}</Typography>
          <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>{result.text}</Typography>
          {result.tool === 'draft' && (
            canReply ? (
              <Button size="small" variant="contained" sx={{ mt: 1.5 }} onClick={() => onUseDraft(result.text)}>
                Use as reply
              </Button>
            ) : (
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                This ticket is closed, so it can&apos;t be replied to.
              </Typography>
            )
          )}
        </Box>
      )}
    </Paper>
  );
}
