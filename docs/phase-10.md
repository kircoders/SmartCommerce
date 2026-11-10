# Phase 10: Reporting & Role-Based Dashboards

## Goal
Turn the data collected by the earlier phases into views people can use: a dashboard for each role showing what needs attention right now, plus business reports for operations managers and admins covering any date range.

- **Dashboards** answer "what's going on **right now**?" (4 shipments waiting to pack, 2 critical incidents).
- **Reports** answer "what happened **between these dates**?" (orders, revenue, shipments, returns, tickets, and incidents, by day, week, or month).

Neither one changes data - every endpoint in this phase only reads tables built in Phases 1-9 and adds them up.

---

## Why This Comes Next
By Phase 9 the platform has users, products, inventory, orders, shipments, support tickets, returns, refunds, and incidents. That's enough real activity to summarize, and every role now has work worth putting on a home screen.

---

## Tech Stack
Same as every phase - **not** Spring Boot/Java/Tailwind/ECS (the original draft of this doc specified those).

| Layer | Technology |
|---|---|
| Backend | NestJS + TypeScript |
| Frontend | Next.js + TypeScript + Material UI, **MUI X Charts** (new) |
| Database | PostgreSQL (Amazon RDS) |
| ORM | TypeORM (QueryBuilder for GROUP BY / SUM / date math) |
| Auth | JWT, `JwtAuthGuard` + `RolesGuard` |
| Cloud | AWS App Runner (backend), Amplify (frontend), Secrets Manager |
| API Docs | Swagger/OpenAPI at `/api/docs` |

---

## Database Tables
No new tables and no migrations. The spec's optional `reports` table wasn't built: reports are calculated fresh on every request and never saved.

Tables read: `users`, `products`, `inventory`, `orders`, `order_items`, `shipments`, `support_tickets`, `returns`, `refunds`, `incidents`.

---

## API Endpoints

### Dashboards (`api/src/dashboard`)
One endpoint per role. Each is locked to its own role plus the roles above it that can already see that area of the app.

| Method | Endpoint | Roles | What's in it |
|---|---|---|---|
| GET | `/api/dashboard/customer` | CUSTOMER | The caller's own account info, order count, recent orders, active shipments, returns, open tickets |
| GET | `/api/dashboard/support` | SUPPORT_AGENT, OPS, ADMIN | Tickets by status, open tickets by priority, assigned to me, unassigned, returns awaiting review, my tickets, recently updated |
| GET | `/api/dashboard/warehouse` | WAREHOUSE_OPERATOR, OPS, ADMIN | Awaiting fulfillment / packing / shipment, inventory summary, low-stock count and list |
| GET | `/api/dashboard/operations` | OPS, ADMIN | Orders by status, revenue (gross, refunded, net), pending shipments, open tickets, returns to review / refund, open and critical incidents, low stock, system status |
| GET | `/api/dashboard/admin` | ADMIN | Users by role, products (total / active), orders, open tickets, returns to review, open incidents, system status |

### Reports (`api/src/reports`)
OPERATIONS_MANAGER and ADMIN only (`@Roles` on the whole controller). Every other role gets `403`, no token gets `401`.

| Method | Endpoint | What's in it |
|---|---|---|
| GET | `/api/reports` | Business summary: the totals from every report below, plus a combined timeline |
| GET | `/api/reports/orders` | Orders placed, items sold, cancelled, orders by current status, top 5 products |
| GET | `/api/reports/revenue` | Gross sales, refunded, net, paid orders, average order value |
| GET | `/api/reports/shipments` | Created, shipped, delivered, average days to ship / order-to-door, by status |
| GET | `/api/reports/returns` | Returns requested, return rate, refunds paid (count and amount), by status |
| GET | `/api/reports/support` | Tickets opened and closed, average hours to close, by status / priority / category |
| GET | `/api/reports/incidents` | Incidents opened, critical, resolved, average hours to resolve, by status / severity / type |

**Shared query string** (all optional):

| Param | Example | Default | Rules |
|---|---|---|---|
| `from` | `2026-11-01` | 29 days before `to` | Real date, `YYYY-MM-DD` |
| `to` | `2026-11-09` | Today (in `timeZone`) | Real date, `YYYY-MM-DD` |
| `groupBy` | `week` | `day` | `day`, `week` (Mondays), or `month` |
| `timeZone` | `America/New_York` | `UTC` | A real IANA time zone |

`from` after `to` returns 400, as does a range longer than 2 years. Unknown params return 400.

Every report has the same shape: `range` (the filters actually used), `totals`, breakdowns (`byStatus` etc.), and `timeline` - one row per day/week/month, including empty ones as 0, so charts have no gaps.

---

## Feature Specs

### What counts as "open" / "pending" (dashboards)
Defined once at the top of `dashboard.service.ts` so every dashboard counts the same way:
- **Open tickets:** OPEN, IN_PROGRESS, WAITING_FOR_CUSTOMER
- **Open returns:** REQUESTED, APPROVED, RECEIVED
- **Active shipments (customer):** CREATED, PACKED, SHIPPED
- **Pending shipments:** CREATED, PACKED
- **Open incidents:** OPEN, IN_PROGRESS
- **Low stock:** `quantity_available <= low_stock_threshold` (same rule as the inventory page)

### Revenue
Gross = total of orders that weren't cancelled. Refunded = completed refunds. Net = gross − refunded. The dashboard's revenue is all-time; the report's covers the chosen range.

### Which date each report number uses
Each number uses the date the thing it measures actually happened:

| Number | Date column |
|---|---|
| Orders placed, revenue | `orders.created_at` |
| Refunds | `refunds.processed_at` |
| Shipments created / shipped / delivered | `shipments.created_at` / `shipped_date` / `delivered_date` |
| Returns requested | `returns.requested_at` |
| Tickets opened / closed | `support_tickets.created_at` / `closed_at` |
| Incidents opened / resolved | `incidents.created_at` / `resolved_at` |

So "shipped this week" includes an order placed last week that went out on Monday. Breakdowns ("by status") describe the records created in the range, by the status they're in **now**.

### Time zones
A day means midnight to midnight in the manager's time zone, not UTC - otherwise anything after ~7pm in New York lands on "tomorrow." The frontend sends the browser's time zone; the SQL converts with `AT TIME ZONE`, and the timeline groups with `date_trunc` in that zone.

### Return rate
Of the orders placed in the range, the percent that have a return (at any time since). An earlier version divided returns requested in the range by orders placed in the range, which hit 300% when returns were for older orders.

### System status
`SELECT 1` timed against the database. If it fails, the dashboard still loads and shows the database as DOWN instead of erroring.

---

## Frontend Screens

| Screen | Route | Notes |
|---|---|---|
| Customer Dashboard | `/dashboard/customer` | Cards: orders, on the way, open returns, open tickets. Lists: recent orders, on the way, returns, open tickets (each row links to its detail page). Account card. |
| Support Dashboard | `/dashboard/support` | Cards link to the ticket queue filters (mine, unassigned) and returns to review. Workload by status and priority. Assigned to me, recently updated. |
| Warehouse Dashboard | `/dashboard/warehouse` | Awaiting fulfillment / packing / shipment, low stock (orange). Low-stock list links to the inventory edit page. Inventory summary. |
| Operations Dashboard | `/dashboard/operations` | Total orders, net revenue (with gross − refunded), pending work cards, low stock, incident row from Phase 9, orders by status, low-stock list, system status. "Reports" button. |
| Admin Dashboard | `/dashboard/admin` | Users, products, orders, open tickets, "Needs attention" row, users by role, system status. "Reports" button. |
| Reports & Analytics | `/dashboard/reports` | OPS and ADMIN only. Presets (Today, This week, This month, Last 30 days, Last 12 months), From/To dates, Group by. Tabs for the summary and each report: number cards, breakdowns, bar chart, scrolling table, Download CSV. |

Every dashboard page is now role-guarded on the frontend too: logged-out users go to `/login`, other roles go to their own dashboard (the backend would return 403 anyway). Users already land on their own dashboard after login (from Phase 1).

**Shared pieces:**
- `hooks/useDashboard.ts` - the auth check + load-once logic every dashboard page uses
- `components/dashboard/` - `DashboardShell` (banner, title, error, quick links, logout), `StatCards`, `ListCard`, `FiguresCard`, `SystemStatusCard`
- `components/reports/TimelineSection.tsx` - chart + table + CSV for any timeline; each tab passes its columns. Money columns can be kept off the chart (`hideOnChart`) so dollars don't flatten the count bars.
- `components/reports/ReportViews.tsx` - what each report tab shows

**CSV export** is built in the browser from the timeline already on screen (a `Blob` + a temporary download link) - no server call, nothing stored in S3. Money is written as plain numbers so spreadsheets can add it up.

---

## Deployment Notes
- No migrations.
- New frontend dependency: `@mui/x-charts@9.17.0`.
- `infra/deploy.ps1` fixes found while deploying Phases 5-9:
  - The ECR login is piped through `cmd`, because Windows PowerShell 5.1 re-encodes text piped between programs and corrupted the password (400 from ECR).
  - The image tag uses `"${EcrRepo}:latest"` - `"$EcrRepo:latest"` is read by PowerShell as a scoped variable and came out empty.

---

## Completion Checklist
- [x] Every user is redirected to the correct dashboard after login
- [x] Each dashboard displays role-specific information
- [x] Customers can view their recent activity
- [x] Support agents can view ticket summaries
- [x] Warehouse operators can view shipment and inventory summaries
- [x] Operations managers can view business KPIs
- [x] Administrators can view overall platform metrics
- [x] Business reports can be generated
- [x] Reports support filtering by date range
- [x] Reporting endpoints are protected by role
- [x] Customers cannot access management reports
- [x] Support agents cannot access executive reports
- [x] Warehouse operators cannot access executive reports
- [x] The frontend successfully communicates with backend reporting APIs

Verified through Postman (dashboards as all five roles; reports as an operations manager and a customer) and in the browser (all five dashboards; Reports as an operations manager, plus a customer being redirected away). Report numbers were cross-checked against hand-written SQL.

---

## Not Included in Phase 10
Saved reports table, scheduled reports (EventBridge/Lambda), PDF export, exported files in S3, AI report summaries, audit logs, CloudWatch dashboards, final production deployment.
