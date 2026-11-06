# Phase 9: Incident Management

## Goal
Build the incident management system that allows operations managers and administrators to track internal business issues affecting orders, shipments, inventory, customers, or system operations.

An incident is a problem the business notices about itself - a carrier delaying packages, a shelf count that doesn't match the system, a customer escalation. Unlike support tickets (started by a customer) and returns (a customer sending something back), incidents are internal and customers never see them.

At the end of this phase, operations managers and admins can create incidents, update their details and notes, move them through statuses, resolve and close them, and see incident counts on the operations dashboard.

---

## Why This Comes Next
Once orders, shipments, support tickets, returns, and refunds exist, the business has enough operational activity for things to go wrong. Incidents usually relate to things that already happened inside those workflows, so this follows them.

This phase provides the foundation for operational visibility, internal issue tracking, and future dashboard metrics, audit logging, and monitoring.

---

## Tech Stack
Same as every phase - **not** Spring Boot/Java/Tailwind/ECS (the original draft of this doc specified those).

| Layer | Technology |
|---|---|
| Backend | NestJS + TypeScript |
| Frontend | Next.js + TypeScript + Material UI |
| Database | PostgreSQL (Amazon RDS) |
| ORM | TypeORM |
| Auth | JWT, `JwtAuthGuard` + `RolesGuard` |
| Cloud | AWS App Runner (backend), Amplify (frontend), Secrets Manager |
| API Docs | Swagger/OpenAPI at `/api/docs` |

---

## Database Tables

As built (migration `1782777011380-CreateIncidents`):

```sql
incidents (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by   UUID NOT NULL REFERENCES users(id),
  order_id     UUID REFERENCES orders(id),          -- optional
  shipment_id  UUID REFERENCES shipments(id),       -- optional
  type         VARCHAR(30) NOT NULL,
  severity     VARCHAR(20) NOT NULL,
  status       VARCHAR(20) NOT NULL DEFAULT 'OPEN',
  title        VARCHAR(200) NOT NULL,
  description  TEXT NOT NULL,
  notes        TEXT,
  resolved_at  TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
)
```

- **Types:** `SHIPMENT_DELAY`, `INVENTORY_ISSUE`, `WAREHOUSE_ISSUE`, `CUSTOMER_ESCALATION`, `SYSTEM_ISSUE`, `OTHER`
- **Severities:** `LOW`, `MEDIUM`, `HIGH`, `CRITICAL`
- **Statuses:** `OPEN`, `IN_PROGRESS`, `RESOLVED`, `CLOSED`

**Relationships:** each incident is created by one user, and may point at one order and/or one shipment.

---

## API Endpoints

All routes are OPERATIONS_MANAGER and ADMIN only - reads included. Every other role gets `403`, no token gets `401`.

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/incidents` | Create an incident (starts `OPEN`) |
| GET | `/api/incidents` | List, most recently updated first. Filters: `status`, `severity`, `type`, `q` (searches title and description), `unresolved=true` (OPEN or IN_PROGRESS). Filters combine. |
| GET | `/api/incidents/summary` | `{ open, critical, recentlyResolved }` for the operations dashboard |
| GET | `/api/incidents/:id` | One incident with its creator, order, and shipment |
| PUT | `/api/incidents/:id` | Edit title, type, severity, description, and/or notes (send only what changed; at least one field) |
| PATCH | `/api/incidents/:id/status` | `{ status }` - change status, following the rules below |
| PATCH | `/api/incidents/:id/resolve` | Shortcut for status `RESOLVED` |

All `:id` parameters are validated as UUIDs (`ParseUUIDPipe`). `/summary` is declared before `/:id` so it isn't read as an id.

---

## Feature Specs

### Status flow
`OPEN → IN_PROGRESS → RESOLVED → CLOSED`. `OPEN` can go straight to `RESOLVED`. A `RESOLVED` incident can be reopened (back to `IN_PROGRESS`) if the problem comes back. `IN_PROGRESS → OPEN` isn't allowed, and `CLOSED` is final. Sending the status an incident already has is a no-op.

Status only changes through `PATCH /:id/status` (or `/resolve`), so the rules live in one place - `PUT` rejects a `status` field.

### Resolved date
Moving to `RESOLVED` sets `resolved_at`. Reopening clears it. Moving on to `CLOSED` keeps it.

### Closed incidents
A closed incident can't be edited (`PUT` returns 400) or moved to any other status.

### Linking orders and shipments
Both are optional and set when the incident is created. The backend checks that a linked order or shipment exists (`404` otherwise). If both are sent, the shipment has to belong to that order. If only a shipment is sent, its order is linked automatically.

### Dashboard summary
- **Open:** `OPEN` or `IN_PROGRESS`
- **Critical:** `CRITICAL` severity and still open or in progress
- **Recently resolved:** `resolved_at` within the last 7 days (covers resolved and closed incidents; reopening clears the date so it stops counting)

### Notes
One editable notes field (what's been tried, who's been contacted), the same idea as internal notes on returns. Sending `""` clears it.

---

## Frontend Screens

| Screen | Route | Notes |
|---|---|---|
| Incidents | `/dashboard/incidents` | Table with severity and status chips; search (runs on Enter); status, severity, and type filters; "Clear filters". Filters start from the URL (`?status=UNRESOLVED&severity=CRITICAL`). "New incident" opens the create popup. |
| Incident Details | `/dashboard/incidents/detail?id=` | Description, linked order and shipment cards (shipment links to its warehouse page), next-step buttons for the current status only, notes box, history (created by, resolved, last updated). Edit opens the popup. Closing asks for confirmation. Closed incidents hide Edit and show notes read-only. |
| Operations Dashboard | `/dashboard/operations` | Three cards: Open, Critical (red when above 0), Resolved this week. Open and Critical link to the filtered Incidents list. |

Shared component: `components/incidents/IncidentFormDialog.tsx` - the create and edit popup. Create mode includes optional order/shipment IDs (checked to look like IDs before sending) and starting notes.

Entry points: "Incidents" on the operations and admin dashboards, and **"Report incident"** on the shipment detail page (operations managers and admins only) - it opens the create popup with that shipment filled in and the type set to Shipment Delay.

Severity colors: Low grey, Medium blue, High orange, Critical red.

---

## Deployment Notes
- Migration `...380` is already applied to RDS.
- No new dependencies or infrastructure.

---

## Completion Checklist
- [x] The incidents table has been created
- [x] Operations managers can create incidents
- [x] Administrators can create incidents
- [x] Incidents can optionally link to orders
- [x] Incidents can optionally link to shipments
- [x] Incidents have a type, severity, and status
- [x] Incidents can be searched and filtered
- [x] Incident details can be viewed
- [x] Incident status can be updated
- [x] Incidents can be marked as resolved
- [x] Resolved incidents store a resolved date
- [x] Operations Dashboard shows basic incident counts
- [x] Customers cannot access incident management
- [x] Support agents cannot manage incidents
- [x] Warehouse operators cannot manage incidents
- [x] Only operations managers and admins can manage incidents
- [x] The frontend successfully communicates with backend incident APIs

Verified through Postman (backend, 6 steps) and in the browser as an operations manager and a warehouse operator (frontend). Admin access uses the same role check as operations managers but wasn't tested with an admin login.

---

## Not Included in Phase 9
Full business reports, executive dashboards, AI incident summaries, audit logs, CloudWatch monitoring dashboard, deployment automation, final AWS production deployment.
