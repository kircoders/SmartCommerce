# Phase 7: Customer Support Tickets

## Goal
Build the customer support system that allows customers to submit complaints and allows support agents to manage, respond to, and resolve support tickets.

This phase creates the communication layer between customers and internal support staff. At the end of this phase, customers can submit support tickets related to orders or shipments, and support agents can review tickets, reply to customers, assign tickets, update ticket status, and close resolved issues.

---

## Why This Comes Next
After customers can place orders and track shipments, they need a way to report problems. Support comes after orders and shipments because many complaints are connected to a specific order or delivery.

This phase provides the foundation for customer complaints, support agent workflows, ticket conversations, order-related issue tracking, and future AI complaint summaries, suggested responses, and support reporting.

---

## Tech Stack
Same as every phase — **not** Spring Boot/Java/Tailwind/ECS (the original draft of this doc incorrectly specified those).

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

As built (migration `1782777011376-CreateSupportTickets`; timestamps converted to `TIMESTAMPTZ` by `...377` and `...378`, see below):

```sql
support_tickets (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id        UUID NOT NULL REFERENCES users(id),
  order_id           UUID REFERENCES orders(id),          -- optional
  assigned_agent_id  UUID REFERENCES users(id),           -- optional
  category           VARCHAR(30) NOT NULL,
  subject            VARCHAR(200) NOT NULL,
  description        TEXT NOT NULL,                       -- the original complaint
  priority           VARCHAR(10) NOT NULL DEFAULT 'MEDIUM',
  status             VARCHAR(25) NOT NULL DEFAULT 'OPEN',
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  closed_at          TIMESTAMPTZ
)

support_ticket_messages (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id   UUID NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
  sender_id   UUID NOT NULL REFERENCES users(id),
  message     TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
)
```

- **Categories:** `DELAYED_SHIPMENT`, `WRONG_ITEM`, `DAMAGED_ITEM`, `MISSING_PACKAGE`, `OTHER`
- **Statuses:** `OPEN`, `IN_PROGRESS`, `WAITING_FOR_CUSTOMER`, `RESOLVED`, `CLOSED`
- **Priorities:** `LOW`, `MEDIUM`, `HIGH`, `URGENT` — every ticket starts at `MEDIUM`; agents can see priority but not change it yet (the spec only requires viewing it)

**Relationships:** each ticket belongs to one customer, may reference one of that customer's orders, may be assigned to one support agent, and has many messages. Each message has one sender (customer or agent).

---

## API Endpoints

### Customer (`/api/support/tickets`) — CUSTOMER only
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/support/tickets` | File a ticket (order must be the caller's own) |
| GET | `/api/support/tickets/me` | List the caller's tickets, most recently updated first |
| GET | `/api/support/tickets/me/:id` | One of the caller's tickets, with its conversation |
| POST | `/api/support/tickets/:id/messages` | Reply on the caller's own ticket |

### Agent (`/api/support/agent/tickets`) — SUPPORT_AGENT, OPERATIONS_MANAGER, ADMIN
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/support/agent/tickets?status=&assignedToMe=` | Ticket queue, most recently updated first |
| GET | `/api/support/agent/tickets/:id` | Any ticket, with customer, order, and conversation |
| POST | `/api/support/agent/tickets/:id/messages` | Reply as an agent |
| PATCH | `/api/support/agent/tickets/:id/assign` | Assign to a support agent |
| PATCH | `/api/support/agent/tickets/:id/status` | Change status (sets `closed_at` on CLOSED) |

### Customer Lookup (`/api/support/customers`) — SUPPORT_AGENT, OPERATIONS_MANAGER, ADMIN
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/support/customers/search?q=` | Search customers by name or email (max 20) |
| GET | `/api/support/customers/:id` | Profile, order history, and ticket history |

### Support Agents (`/api/support/agents`) — SUPPORT_AGENT, OPERATIONS_MANAGER, ADMIN
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/support/agents` | List support agents — feeds the frontend's assign dropdown (not in the original spec) |

All `:id` parameters are validated as UUIDs (`ParseUUIDPipe`) — a malformed ID returns `400`, not `500`.

---

## Feature Specs

### Ownership and roles
Customer routes filter every lookup by `customerId`, so another customer's ticket returns `404`. Customers get `403` on all agent and lookup routes.

### Conversation
Messages are always returned oldest first. A new message bumps the ticket's `updated_at`, so the agent queue's "recently updated" ordering reflects replies. Neither side can reply on a `CLOSED` ticket (`400`); an agent reopens it by changing its status first.

### Assignment
Tickets can only be assigned to a user with the `SUPPORT_AGENT` role (`400` otherwise).

### Status and closed date
`closed_at` is set when a ticket moves to `CLOSED`. Reopening keeps the previous `closed_at` as a record.

### Customer lookup
Search matches email, first name, or last name (case-insensitive), customers only. An empty search returns `400`. Return history will be added once returns exist.

---

## Bugs Found and Fixed This Phase
- **Password hashes leaked** into every response that included a user (ticket customer, assigned agent, message sender, customer search). Fixed app-wide: `passwordHash` is `select: false` on `UserEntity` and only loaded by `UsersService.findByEmailWithPassword()` for login.
- **All timestamps were 7 hours off locally.** Plain `TIMESTAMP` columns were filled by the UTC database but read by the driver as local (Pacific) time. Every timestamp column is now `TIMESTAMPTZ` (migrations `...377`, `...378`). Production on App Runner (UTC) was unaffected.
- Tickets could be assigned to customers; replies were allowed on closed tickets; empty search returned everything; the assign response showed the old assignment; malformed IDs caused `500`s; message order wasn't guaranteed.

---

## Frontend Screens

| Screen | Route | Notes |
|---|---|---|
| Contact Support | `/support/new` | Category, subject, message, optional order; `?orderId=` pre-selects an order. Redirects to the new ticket on submit. |
| My Support Tickets | `/support` | Customer's tickets with status and related order |
| Ticket Details (customer) | `/support/ticket?id=` | Complaint, conversation, reply box (hidden when closed) |
| Support Dashboard | `/dashboard/support` | Counts (open, assigned to me, waiting for customer) and links |
| Support Tickets | `/dashboard/support/tickets` | Queue with status and "assigned to me" filters |
| Ticket Details (agent) | `/dashboard/support/tickets/detail?id=` | Customer and order info, conversation, reply, assign, status, AI assistant placeholder |
| Customer Lookup | `/dashboard/support/customers` | Search, then profile, orders, and tickets |

Entry points: "Contact Support" and "My Support Tickets" on the customer dashboard, and "Get help with this order" on each order in My Orders.

---

## Completion Checklist
- [x] `support_tickets` table created
- [x] `support_ticket_messages` table created
- [x] Customers can submit support tickets
- [x] Customers can optionally connect tickets to orders
- [x] Customers can view their own support tickets
- [x] Customers can reply to their own tickets
- [x] Support agents can view the support queue
- [x] Support agents can open ticket details
- [x] Support agents can reply to customers
- [x] Tickets can be assigned to support agents
- [x] Ticket statuses can be updated
- [x] Closed tickets store a closed date
- [x] Customers cannot view other customers' tickets
- [x] Customers cannot manage ticket assignments or statuses
- [x] Support agents can search customer records for support context
- [x] The frontend successfully communicates with backend support APIs

Verified through Postman (backend) and in the browser as a customer and a support agent (frontend).

---

## Not Included in Phase 7
AI chatbot, AI complaint summarization, AI suggested responses, return requests, refund processing, incident management, reports, full dashboards, audit logs, file uploads for evidence.
