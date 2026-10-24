'use client';

// Phase 7

// WHAT THIS FILE IS:
// Customer Lookup at /dashboard/support/customers - SUPPORT_AGENT,
// OPERATIONS_MANAGER, ADMIN only. Search customers by name or email, pick
// one, and see their profile, order history, and support ticket history -
// context for whoever is handling their ticket. Arriving with ?id=... (the
// "View customer history" button on a ticket) opens that customer directly.
// Phase 8 added their return history, each row opening the staff Return
// Details page.

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Alert from '@mui/material/Alert';
import Chip from '@mui/material/Chip';
import Paper from '@mui/material/Paper';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemText from '@mui/material/ListItemText';
import CircularProgress from '@mui/material/CircularProgress';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import { useAuth } from '@/hooks/useAuth';
import { User } from '@/types/user';
import { getCustomerContext, searchCustomers } from '@/lib/api/support';
import { DASHBOARD_ROUTES, SUPPORT_STAFF_ROLES } from '@/lib/dashboard-routes';
import { CATEGORY_LABELS, CustomerContext, STATUS_COLORS, STATUS_LABELS } from '@/types/support';
import { RETURN_STATUS_COLORS, RETURN_STATUS_LABELS } from '@/types/returns';

// useSearchParams() requires a Suspense boundary - same reasoning as the
// shipment detail page.
export default function CustomerLookupPage() {
  return (
    <Suspense fallback={null}>
      <CustomerLookup />
    </Suspense>
  );
}

function CustomerLookup() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const presetCustomerId = searchParams?.get('id') ?? '';
  const { user, token, loading: authLoading } = useAuth();

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<User[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [context, setContext] = useState<CustomerContext | null>(null);
  const [loadingContext, setLoadingContext] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (authLoading) return;
    if (!token) { router.push('/login'); return; }
    if (user && !SUPPORT_STAFF_ROLES.includes(user.role)) { router.push(DASHBOARD_ROUTES[user.role]); return; }
    if (presetCustomerId) openCustomer(token, presetCustomerId);
  }, [token, user, authLoading, router, presetCustomerId]);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!token || !query.trim()) return;
    setError('');
    setSearching(true);
    try {
      setResults(await searchCustomers(token, query.trim()));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed');
    } finally {
      setSearching(false);
    }
  }

  async function openCustomer(currentToken: string, customerId: string) {
    setError('');
    setLoadingContext(true);
    try {
      setContext(await getCustomerContext(currentToken, customerId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load customer');
    } finally {
      setLoadingContext(false);
    }
  }

  if (!user || !SUPPORT_STAFF_ROLES.includes(user.role)) return null;

  return (
    <Box sx={{ p: 4, maxWidth: 1200, mx: 'auto' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Customer Lookup</Typography>
        <Button variant="outlined" onClick={() => router.push('/dashboard/support')}>
          Back to Dashboard
        </Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 2fr' }, gap: 4, alignItems: 'start' }}>
        <Box>
          <Box component="form" onSubmit={handleSearch} sx={{ display: 'flex', gap: 1, mb: 2 }}>
            <TextField
              label="Name or email"
              size="small"
              fullWidth
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <Button type="submit" variant="contained" disabled={searching || !query.trim()}>
              {searching ? '...' : 'Search'}
            </Button>
          </Box>

          {results && (
            results.length === 0 ? (
              <Typography color="text.secondary">No customers found.</Typography>
            ) : (
              <Paper variant="outlined">
                <List dense disablePadding>
                  {results.map((customer) => (
                    <ListItemButton
                      key={customer.id}
                      selected={context?.profile.id === customer.id}
                      onClick={() => token && openCustomer(token, customer.id)}
                    >
                      <ListItemText
                        primary={`${customer.firstName} ${customer.lastName}`}
                        secondary={customer.email}
                      />
                    </ListItemButton>
                  ))}
                </List>
              </Paper>
            )
          )}
        </Box>

        <Box>
          {loadingContext ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 8 }}>
              <CircularProgress />
            </Box>
          ) : !context ? (
            <Typography color="text.secondary">Search for a customer and select them to see their history.</Typography>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <Paper variant="outlined" sx={{ p: 2 }}>
                <Typography variant="h6">{context.profile.firstName} {context.profile.lastName}</Typography>
                <Typography color="text.secondary">{context.profile.email}</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  Customer since {new Date(context.profile.createdAt).toLocaleDateString()}
                  {!context.profile.isActive && ' · Inactive account'}
                </Typography>
              </Paper>

              <Box>
                <Typography variant="h6" sx={{ mb: 1 }}>Orders ({context.orders.length})</Typography>
                {context.orders.length === 0 ? (
                  <Typography color="text.secondary">No orders.</Typography>
                ) : (
                  <Paper variant="outlined">
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Order</TableCell>
                          <TableCell>Placed</TableCell>
                          <TableCell>Status</TableCell>
                          <TableCell align="right">Total</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {context.orders.map((order) => (
                          <TableRow key={order.id}>
                            <TableCell sx={{ fontFamily: 'monospace' }}>#{order.id.slice(0, 8)}</TableCell>
                            <TableCell>{new Date(order.createdAt).toLocaleDateString()}</TableCell>
                            <TableCell><Chip label={order.status} size="small" /></TableCell>
                            <TableCell align="right">${Number(order.totalAmount).toFixed(2)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </Paper>
                )}
              </Box>

              <Box>
                <Typography variant="h6" sx={{ mb: 1 }}>Support Tickets ({context.tickets.length})</Typography>
                {context.tickets.length === 0 ? (
                  <Typography color="text.secondary">No support tickets.</Typography>
                ) : (
                  <Paper variant="outlined">
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Subject</TableCell>
                          <TableCell>Category</TableCell>
                          <TableCell>Status</TableCell>
                          <TableCell>Last Updated</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {context.tickets.map((ticket) => (
                          <TableRow
                            key={ticket.id}
                            hover
                            sx={{ cursor: 'pointer' }}
                            onClick={() => router.push(`/dashboard/support/tickets/detail?id=${ticket.id}`)}
                          >
                            <TableCell>{ticket.subject}</TableCell>
                            <TableCell>{CATEGORY_LABELS[ticket.category]}</TableCell>
                            <TableCell>
                              <Chip label={STATUS_LABELS[ticket.status]} size="small" color={STATUS_COLORS[ticket.status]} />
                            </TableCell>
                            <TableCell>{new Date(ticket.updatedAt).toLocaleString()}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </Paper>
                )}
              </Box>

              <Box>
                <Typography variant="h6" sx={{ mb: 1 }}>Returns ({context.returns.length})</Typography>
                {context.returns.length === 0 ? (
                  <Typography color="text.secondary">No returns.</Typography>
                ) : (
                  <Paper variant="outlined">
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Order</TableCell>
                          <TableCell>Requested</TableCell>
                          <TableCell>Status</TableCell>
                          <TableCell align="right">Refund</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {context.returns.map((ret) => (
                          <TableRow
                            key={ret.id}
                            hover
                            sx={{ cursor: 'pointer' }}
                            onClick={() => router.push(`/dashboard/support/returns/detail?id=${ret.id}`)}
                          >
                            <TableCell sx={{ fontFamily: 'monospace' }}>#{ret.orderId.slice(0, 8)}</TableCell>
                            <TableCell>{new Date(ret.requestedAt).toLocaleDateString()}</TableCell>
                            <TableCell>
                              <Chip
                                label={RETURN_STATUS_LABELS[ret.status]}
                                size="small"
                                color={RETURN_STATUS_COLORS[ret.status]}
                              />
                            </TableCell>
                            <TableCell align="right">
                              {ret.refund ? `$${Number(ret.refund.amount).toFixed(2)}` : '—'}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </Paper>
                )}
              </Box>
            </Box>
          )}
        </Box>
      </Box>
    </Box>
  );
}
