# Phase 12: Audit Logs, Security Hardening & Launch

## Goal
Finish the platform and ship it:

- **Audit logs:** record who did what (logins, product changes, orders, shipments, returns, refunds, incidents), with an admin-only page to search them.
- **Security review:** check every route, then fix what came up (login rate limit, strict CORS, private return photos).
- **Order cancellation:** customers can cancel an order until it ships, and the stock goes back.
- **Launch:** deploy everything to AWS and confirm the live site works, including the AI assistant from Phase 11.

---

## Why This Comes Last
Every other feature had to exist first, so the audit log could cover the real actions and the security review could cover the real routes. Deployment was tested in earlier phases; Phase 12 is the final, full deploy.

---

## Tech Stack
Same as every phase, **not** Spring Boot/Java/Tailwind/ECS.

| Layer | Technology |
|---|---|
| Backend | NestJS + TypeScript, `@nestjs/throttler` 6.8 (new) |
| Frontend | Next.js + TypeScript + Material UI |
| Database | PostgreSQL (Amazon RDS), one new table |
| Auth | JWT, `JwtAuthGuard` + `RolesGuard` |
| Infra | Terraform, App Runner, RDS, S3, Bedrock VPC endpoint (new) |

---

## Database Tables
One new table, migration `1782777011381-CreateAuditLogs.ts` (already run on RDS).

**`audit_logs`**
| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `user_id` | uuid FK → `users.id` | who did it |
| `action` | varchar(50) | e.g. `LOGIN`, `ORDER_CANCELLED`, `REFUND_PROCESSED` |
| `entity_type` | varchar(30) | `USER`, `PRODUCT`, `ORDER`, `SHIPMENT`, `SUPPORT_TICKET`, `RETURN`, `REFUND`, `INCIDENT` |
| `entity_id` | uuid, nullable | the row that changed |
| `description` | text | readable sentence, e.g. "Cancelled order #631f5ad4 ($60.50)" |
| `created_at` | timestamptz | |

Rows are only ever inserted. There's no update or delete route.

Order cancellation needed **no migration**: `orders.status` and `shipments.status` are VARCHAR with no CHECK constraint, so `CANCELLED` is just a new enum value in code (`ShipmentStatus.CANCELLED`; `OrderStatus.CANCELLED` already existed).

---

## API Endpoints

| Method | Route | Roles | Notes |
|---|---|---|---|
| GET | `/api/admin/audit-logs` | ADMIN | Filters: `q`, `action`, `entityType`, `userId`, `from`, `to` (ISO dates), `page` (default 1), `pageSize` (default 25, max 100). Returns `{ data, meta: { total, page, pageSize } }`, newest first. |
| GET | `/api/admin/audit-logs/:id` | ADMIN | One row |
| PATCH | `/api/orders/:id/cancel` | CUSTOMER | Cancels the caller's own order. Returns `{ data: order }`. |

- `q` searches the description and the user's email, first name, and last name (ILIKE). That's why searching "p10" returns every row by Avery (p10admin@example.com).
- Cancel errors: 400 bad UUID, 404 not your order / doesn't exist, 400 "already cancelled", 400 "already shipped... request a return once it arrives", 403 for non-customers.

### How audit logging works
- `@Audit({ action, entityType, describe })` decorator on a controller route (`audit.decorator.ts`).
- A global `AuditInterceptor` runs after the route **succeeds**, builds the description from the response, and inserts the row. Failed requests (400/404) aren't logged.
- The insert is fire-and-forget: if it fails, the error is logged and the user's request still succeeds.
- Logged routes: login, logout, product create/update/delete, inventory adjust, order placed, order cancelled, shipment status/tracking, ticket created, return requested, refund processed, incident created/resolved.

---

## Security Review

| Check | Result |
|---|---|
| Every route has a guard | Pass. Public: login, register, announcements banner, health. |
| Users can't make themselves admin | Pass. No `role` field in the register or profile DTOs. |
| Customers only see their own data | Pass. Every customer query filters by `customerId` from the token. |
| JWT | Pass. Checks expiry and that the user is still active. |
| Secrets | Pass. None in code. `infra/terraform.tfvars` only holds IDs/ARNs. |
| Errors | Pass. The exception filter hides stack traces. |
| **Brute-force login** | **Fixed**: rate limit (below). |
| **CORS** | **Fixed**: exact origin list (below). |
| **Return photos public** | **Fixed**: S3 policy (below). |

### Login rate limit
- `ThrottlerModule.forRoot({ throttlers: [{ ttl: 60_000, limit: 5 }] })` in `app.module.ts`, applied only to `POST /auth/login` and `POST /auth/register` with `@UseGuards(ThrottlerGuard)`.
- 5 tries per minute per IP, then **429** "Too many attempts. Please wait a minute and try again."
- `main.ts` sets `trust proxy` so the real client IP is used behind App Runner's load balancer (otherwise everyone shares one limit).
- In-memory: each App Runner instance counts separately. Fine for one instance.

### CORS
- Before: any `*.awsapprunner.com` origin was allowed, and blocked origins got a **500** (the callback threw an Error).
- After: `enableCors({ origin: [exact list], credentials: true })` with localhost:3000/3001, the Amplify URL, and our App Runner URL. Others get no `Access-Control-Allow-Origin` header, so the browser blocks reading the response.

### S3 (Terraform)
- The bucket policy allows public read only on `products/*`. Return evidence photos (`returns/*`) are private and shown through presigned URLs (`signEvidenceUrls` in `returns.service.ts`).
- Verified: a product image → 200, a return photo URL → 403.

### Other fix
- `ProductsService.update()`: a partial update returned blank `name`/`isActive` in the response, because with the ES2023 target every DTO field exists as `undefined`. Now only sent fields are copied. The database was never affected.

---

## Order Cancellation

`OrdersService.cancelOrder()` runs in one transaction:
1. Find the order by `id` **and** `customerId` (someone else's order is a 404).
2. Lock the shipment row (`pessimistic_write`), the same lock `ShipmentsService.updateStatus()` takes, so a cancel and "mark shipped" can't both win.
3. Allowed only while the shipment is `CREATED` or `PACKED`.
4. Shipment → `CANCELLED`, order → `CANCELLED`.
5. Stock back: for each item, `quantityReserved -= qty`, `quantityAvailable += qty` (total unchanged).

Warehouse side:
- The default queue hides cancelled shipments; `?status=CANCELLED` shows them.
- Updating a cancelled shipment → 400 "This order was cancelled by the customer".
- The warehouse can't set `CANCELLED` itself: `UpdateShipmentStatusDto` uses `@IsIn(WAREHOUSE_STATUSES)` (CREATED, PACKED, SHIPPED, DELIVERED).

---

## Frontend Screens

| Screen | Change |
|---|---|
| **Audit Logs** (`/dashboard/admin/audit-logs`, admin) | New, read-only. Search box, Action and Entity type dropdowns, From/To dates, paged table (25/50/100). Dates use the browser's timezone (start of From day to end of To day). Linked from the Admin dashboard. |
| **My Orders** (`/orders`, customer) | "Cancel order" button on PLACED/PROCESSING orders → "Cancel this order?" popup (Keep order / Cancel order). |
| **Warehouse Shipments** | Red CANCELLED chip and a "Cancelled" filter. |
| **Shipment Details** | Warning banner on cancelled shipments; status update disabled. |
| **AI chat** (`/support`, customer) | Chat history now survives a refresh: saved in the browser's localStorage (`lib/chat-history.ts`), one key per user (`aiChat:<userId>`), newest 50 turns. "Clear chat" button starts over; logout (`useAuth.clearAuth`) deletes all saved chats so a shared computer keeps nothing. Still nothing stored on the server. |

Files: `types/audit-log.ts`, `lib/api/audit-logs.ts`, `cancelOrder()` in `lib/api/orders.ts`, `CANCELLED` in `types/shipment.ts`.

---

## Deployment Notes
- **Bedrock permission** (`infra/iam.tf`): the App Runner instance role got `bedrock:InvokeModel` on the `us.anthropic.claude-sonnet-4-6` inference profile and on `foundation-model/anthropic.claude-sonnet-4-6*` in any region (the profile can route to other US regions).
- **Bedrock VPC endpoint:** on the live site the AI first returned 503 with "Request timed out." App Runner sends all outbound traffic through the VPC (to reach RDS), and the default VPC has no internet exit, the same problem S3 had in Phase 2. S3 has a free Gateway endpoint; Bedrock only has an **Interface** endpoint (~$0.01/hour).
  - Terraform (`vpc_endpoints.tf`) creates only the free security group: HTTPS (443) from the App Runner security group.
  - `up.ps1` creates the endpoint (`com.amazonaws.us-east-1.bedrock-runtime`, one subnet, private DNS on); `down.ps1` deletes it. It only costs money while the app is up.
  - Private DNS took a few minutes after "available" before calls stopped timing out.
- **Deploy steps:** `up.ps1` (RDS → Bedrock endpoint → App Runner), then `deploy.ps1` (build image → ECR → App Runner redeploy, needs Docker Desktop). The frontend deploys on `git push` (Amplify).
- `deploy.ps1` has to run in its own PowerShell process (`powershell -File deploy.ps1`): with `$ErrorActionPreference = "Stop"`, redirecting Docker's progress output makes PowerShell 5.1 stop the script.

### Live checks (App Runner)
Health 200, logins (customer + admin), audit logs (43 rows), cancel route (400 bad ID / 404 unknown), CORS (Amplify allowed, evil.com blocked), AI chat answering in ~2s.

---

## Completion Checklist
- [x] Important actions are recorded in `audit_logs`
- [x] Admins can search and filter audit logs (text, action, entity, date range, paging)
- [x] Audit log page is admin-only (other roles get 403)
- [x] All routes reviewed for guards, roles, and ownership
- [x] Login and register are rate-limited (429 after 5 tries/minute)
- [x] CORS only allows our own frontends
- [x] Return photos are private; product images stay public
- [x] Customers can cancel orders that haven't shipped, and stock is returned
- [x] Shipped orders can't be cancelled; cancelled shipments can't be updated
- [x] Backend deployed to App Runner, AI assistant working live
- [x] Frontend deployed through Amplify (on push)

Verified with scripted tests, in Postman (audit logs, the login limit), and in the browser (Audit Logs page as Avery; cancelling as Paula, including Keep order).

---

## Not Included in Phase 12
Helmet security headers, hiding Swagger in production, a shared rate-limit store (Redis) for multiple instances, admin-side order cancellation, partial cancellation, audit log export, lint cleanup of older files.

---

## Project Completion

SmartCommerce is finished: all 12 phases are built, tested, and deployed.

| Phase | What it added |
|---|---|
| 1 | Authentication & user management (JWT, roles), AWS setup with Terraform |
| 2 | Product catalog, S3 image uploads |
| 3 | Inventory management |
| 4 | Shopping cart & checkout |
| 5 | Order management |
| 6 | Shipping & warehouse fulfillment |
| 7 | Customer support tickets |
| 8 | Returns and refunds |
| 9 | Incident management |
| 10 | Reports and role-based dashboards |
| 11 | AI support assistant (Claude on Bedrock) |
| 12 | Audit logs, security hardening, order cancellation, launch |

**Five roles:** Customer, Support Agent, Warehouse Operator, Operations Manager, Admin, each with its own dashboard and permissions.

**Live:**
- Frontend: https://main.dwdi02ueunudy.amplifyapp.com (Amplify)
- API: https://3hfuwvhp27.us-east-1.awsapprunner.com/api (App Runner, Swagger at `/api/docs`)

**Running costs:** `down.ps1` pauses App Runner, stops RDS, and deletes the Bedrock endpoint; `up.ps1` brings everything back (~5 min).

**Next:** the study plan (SQL practice, search/filter/pagination on the staff pages).
