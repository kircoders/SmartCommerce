'use client';

// Phase 8

// WHAT THIS FILE IS:
// The "what's coming back" table, shared by the customer's and the staff's
// Return Details pages: product, how many of how many bought, condition
// notes, and the line amount at the price actually paid - plus the total,
// which is exactly what the backend will refund.

import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Paper from '@mui/material/Paper';
import { ReturnItem } from '@/types/returns';

// Same math as the backend's RefundsService: unit price x quantity, in
// cents so it can't drift by a fraction of a cent.
export function refundTotal(items: ReturnItem[]): number {
  const cents = items.reduce(
    (sum, item) => sum + Math.round(Number(item.orderItem?.unitPrice ?? 0) * 100) * item.quantity,
    0,
  );
  return cents / 100;
}

export default function ReturnItemsTable({ items }: { items: ReturnItem[] }) {
  return (
    <Paper variant="outlined">
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Product</TableCell>
            <TableCell align="right">Returning</TableCell>
            <TableCell>Condition</TableCell>
            <TableCell align="right">Amount</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {items.map((item) => (
            <TableRow key={item.id}>
              <TableCell>{item.orderItem?.productName ?? '—'}</TableCell>
              <TableCell align="right">
                {item.quantity}
                {item.orderItem && ` of ${item.orderItem.quantity}`}
              </TableCell>
              <TableCell>{item.conditionNotes || '—'}</TableCell>
              <TableCell align="right">
                ${(Number(item.orderItem?.unitPrice ?? 0) * item.quantity).toFixed(2)}
              </TableCell>
            </TableRow>
          ))}
          <TableRow>
            <TableCell colSpan={3} sx={{ fontWeight: 600 }}>Refund total</TableCell>
            <TableCell align="right" sx={{ fontWeight: 600 }}>${refundTotal(items).toFixed(2)}</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </Paper>
  );
}
