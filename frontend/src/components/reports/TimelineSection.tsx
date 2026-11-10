'use client';

// Phase 10

// WHAT THIS FILE IS:
// The bottom half of every report: the timeline as a bar chart, the same
// numbers as a table underneath, and a "Download CSV" button. Each report
// tab just says which columns it has and which of them go on the chart.

import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Typography from '@mui/material/Typography';
import { BarChart } from '@mui/x-charts/BarChart';
import { formatMoney } from '@/types/dashboard';
import { ReportGroupBy } from '@/types/reports';

export interface TimelineColumn<K extends string> {
  key: K;
  label: string;
  money?: boolean;
  // Leave a column out of the chart when its scale doesn't match the
  // others (dollars next to counts would flatten every count bar).
  hideOnChart?: boolean;
}

interface TimelineSectionProps<K extends string> {
  title: string;
  rows: ({ period: string } & Record<K, number>)[];
  columns: TimelineColumn<K>[];
  groupBy: ReportGroupBy;
  fileName: string;
}

export default function TimelineSection<K extends string>({
  title,
  rows,
  columns,
  groupBy,
  fileName,
}: TimelineSectionProps<K>) {
  const chartColumns = columns.filter((c) => !c.hideOnChart);
  const empty = rows.every((row) => columns.every((c) => row[c.key] === 0));

  function format(column: TimelineColumn<K>, value: number): string {
    return column.money ? formatMoney(value) : value.toLocaleString();
  }

  return (
    <Card variant="outlined" sx={{ mb: 2 }}>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1, gap: 2 }}>
          <Typography variant="h6">{title}</Typography>
          <Button variant="outlined" size="small" onClick={() => downloadCsv(fileName, rows, columns)}>
            Download CSV
          </Button>
        </Box>

        {empty ? (
          <Typography color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>
            Nothing happened in this date range.
          </Typography>
        ) : (
          <BarChart
            height={300}
            xAxis={[{ scaleType: 'band', data: rows.map((r) => periodLabel(r.period, groupBy)) }]}
            series={chartColumns.map((c) => ({
              data: rows.map((r) => r[c.key]),
              label: c.label,
              valueFormatter: (v: number | null) => (v === null ? '' : format(c, v)),
            }))}
          />
        )}

        {/* Long ranges by day are a lot of rows - scroll inside the card. */}
        <TableContainer sx={{ maxHeight: 360, mt: 2 }}>
          <Table size="small" stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell>{groupBy === 'day' ? 'Day' : groupBy === 'week' ? 'Week of' : 'Month'}</TableCell>
                {columns.map((c) => (
                  <TableCell key={c.key} align="right">{c.label}</TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.period} hover>
                  <TableCell>{periodLabel(row.period, groupBy)}</TableCell>
                  {columns.map((c) => (
                    <TableCell
                      key={c.key}
                      align="right"
                      sx={{ color: row[c.key] < 0 ? 'error.main' : row[c.key] === 0 ? 'text.disabled' : undefined }}
                    >
                      {format(c, row[c.key])}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </CardContent>
    </Card>
  );
}

// '2026-11-09' -> "Nov 9" (day/week) or "Nov 2026" (month). The date is a
// plain calendar day, so format it in UTC - formatting in the browser's
// zone could shift it to the day before.
export function periodLabel(period: string, groupBy: ReportGroupBy): string {
  const date = new Date(`${period}T00:00:00Z`);
  return groupBy === 'month'
    ? date.toLocaleDateString('en-US', { month: 'short', year: 'numeric', timeZone: 'UTC' })
    : date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
}

// Builds the CSV text in the browser and hands it to the user as a file -
// no server involved. Money stays a plain number (60.5, not "$60.50") so
// spreadsheets can add it up.
function downloadCsv<K extends string>(
  fileName: string,
  rows: ({ period: string } & Record<K, number>)[],
  columns: TimelineColumn<K>[],
) {
  const header = ['period', ...columns.map((c) => c.label)];
  const lines = [header, ...rows.map((row) => [row.period, ...columns.map((c) => String(row[c.key]))])].map(
    (cells) => cells.map(csvCell).join(','),
  );

  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}

// A cell with a comma, quote, or line break has to be wrapped in quotes,
// with any quotes inside doubled ("" ).
function csvCell(value: string): string {
  return /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}
