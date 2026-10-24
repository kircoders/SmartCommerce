# Phase 8: Returns & Refund Management

## Goal
Build the returns and refunds system that allows customers to request product returns and allows authorized employees to review requests, process returns, and issue refunds.

This phase completes the customer purchase lifecycle. At the end of this phase, customers can request returns for delivered orders, upload photo evidence, and track their return and refund; support staff can review, approve, reject, and receive returns; and operations managers and admins can issue refunds.

---

## Why This Comes Next
Once customers can receive orders and contact support, they need a standardized way to send products back. Returns depend on completed orders and delivered shipments, so this follows Order Management, Shipping, and Customer Support.

This phase provides the foundation for product returns, refund processing, return status tracking, return evidence, and future return analytics.

---

## Tech Stack
Same as every phase — **not** Spring Boot/Java/Tailwind/ECS (the original draft of this doc specified those).

| Layer | Technology |
|---|---|
| Backend | NestJS + TypeScript |
| Frontend | Next.js + TypeScript + Material UI |
| Database | PostgreSQL (Amazon RDS) |
| ORM | TypeORM |
| Auth | JWT, `JwtAuthGuard` + `RolesGuard` |
| File storage | Amazon S3 (evidence photos), `@aws-sdk/s3-request-presigner` for signed links |
| Cloud | AWS App Runner (backend), Amplify (frontend), Secrets Manager |
| API Docs | Swagger/OpenAPI at `/api/docs` |

---

## Database Tables

As built (migration `1782777011379-CreateReturns`):

```sql
returns (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id        UUID NOT NULL REFERENCES orders(id),
  customer_id     UUID NOT NULL REFERENCES users(id),
  reason          TEXT NOT NULL,
  status          VARCHAR(20) NOT NULL DEFAULT 'REQUESTED',
  internal_notes  TEXT,                                   -- staff only
  requested_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reviewed_by     UUID REFERENCES users(id),              -- who approved/rejected
  reviewed_at     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
)

return_items (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  return_id        UUID NOT NULL REFERENCES returns(id) ON DELETE CASCADE,
  order_item_id    UUID NOT NULL REFERENCES order_items(id),
  quantity         INTEGER NOT NULL CHECK (quantity > 0),
  condition_notes  TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
)

return_evidence (                                         -- not in the original spec
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  return_id   UUID NOT NULL REFERENCES returns(id) ON DELETE CASCADE,
  s3_key      VARCHAR(1024) NOT NULL,                     -- the file itself lives in S3
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
)

refunds (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  return_id     UUID NOT NULL UNIQUE REFERENCES returns(id),   -- at most one refund per return
  order_id      UUID NOT NULL REFERENCES orders(id),
  amount        NUMERIC(10, 2) NOT NULL CHECK (amount >= 0),
  status        VARCHAR(20) NOT NULL DEFAULT 'PENDING',
  processed_by  UUID REFERENCES users(id),
  processed_at  TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
)
```

- **Return statuses:** `REQUESTED`, `APPROVED`, `REJECTED`, `RECEIVED`, `REFUNDED`
- **Refund statuses:** `PENDING`, `COMPLETED` — with no payment gateway, refunds are created `COMPLETED`; `PENDING` is the default for when a real gateway is added
- `return_evidence` was added because a return can have several photos, and the spec says only file references are stored in PostgreSQL

**Relationships:** each return belongs to one customer and one order, has many returned items and photos, and has at most one refund. Each returned item points at an order item (where the price paid is frozen). Each refund is processed by one employee.

---

## API Endpoints

### Customer (`/api/returns`) — CUSTOMER only
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/returns` | Request a return for items from one of the caller's delivered orders |
| GET | `/api/returns/me` | The caller's returns (with items and refund), most recently updated first |
| GET | `/api/returns/me/:id` | One of the caller's returns, with items, photos, order, and refund |
| POST | `/api/returns/:id/evidence` | Upload one photo (`multipart/form-data`, field `file`) while the return is REQUESTED |

### Support (`/api/support/returns`) — SUPPORT_AGENT, OPERATIONS_MANAGER, ADMIN
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/support/returns?status=` | Returns queue, most recently updated first |
| GET | `/api/support/returns/:id` | One return with customer, order, items, photos, reviewer, refund, and internal notes |
| PATCH | `/api/support/returns/:id/status` | `{ status?, internalNotes? }` — approve, reject, mark received, and/or update notes |

### Refunds (`/api/refunds`)
| Method | Endpoint | Roles | Description |
|---|---|---|---|
| POST | `/api/refunds` | OPERATIONS_MANAGER, ADMIN | `{ returnId }` — refund a RECEIVED return; amount is calculated |
| GET | `/api/refunds/:id` | SUPPORT_AGENT, OPERATIONS_MANAGER, ADMIN | One refund |

All `:id` parameters are validated as UUIDs (`ParseUUIDPipe`).

---

## Feature Specs

### Eligibility and quantities
Only `DELIVERED` orders can be returned, and only the customer's own. Each item can be listed once per request. A customer can file more than one return against the same order, but the total returned per order item can't exceed the quantity bought; items on a **rejected** return don't count, since they never came back. The order row is locked while a return is created so two simultaneous requests can't both return the last item.

### Status flow
`REQUESTED → APPROVED → RECEIVED → REFUNDED`, or `REQUESTED → REJECTED`. `REJECTED` and `REFUNDED` are final, and `APPROVED → REJECTED` is not allowed (decided during testing). `REFUNDED` can't be set through the status endpoint — only by creating a refund, so a return can never say refunded without a refund record. Approving or rejecting records `reviewed_by` and `reviewed_at`.

### Restocking on RECEIVED
When a return is marked `RECEIVED`, each returned item goes back on the shelf: `quantity_available` and `quantity_total` both increase (reserved was already cleared on delivery), and an `inventory_adjustments` row (`INCREASE`, "Return #… received", adjusted by the staff member) explains the change. The return row is locked so it can't be restocked twice. Products deleted since the order are skipped with a warning.

### Refunds
Amount = price paid (frozen on the order item) × quantity returned, summed in cents. The refund row and the return moving to `REFUNDED` happen in one transaction; the return row is locked so a double click can't create two refunds (`return_id` is also `UNIQUE`). Support agents can view refunds but not create them.

### Evidence photos
JPEG, PNG, or WebP, max 5 MB each, max 5 per return, only while `REQUESTED`. Stored in the product-images bucket under `returns/{returnId}/` with a random filename. Only the S3 key is saved; every view returns fresh signed links that expire after 15 minutes. `infra/s3.tf` limits the bucket's public-read policy to `products/*` so evidence isn't public — **see Deployment Notes**.

### Privacy
Customer routes filter by `customerId`, so another customer's return is `404`. `internal_notes` is `select: false` on the entity and only loaded by the staff detail query, so it never reaches a customer.

### Customer lookup
`GET /api/support/customers/:id` now includes the customer's returns (with refunds) — the return history Phase 7 left a placeholder for.

---

## Frontend Screens

| Screen | Route | Notes |
|---|---|---|
| My Returns | `/returns` | Customer's returns with status and refund amount |
| Return Request | `/returns/new` | Delivered orders only; per-item checkbox, quantity capped at what's still returnable, condition notes; reason; up to 5 photos. `?orderId=` pre-selects an order. Creates the return, then uploads each photo. |
| Return Details (customer) | `/returns/detail?id=` | Status with what happens next, items and refund total, reason, photos (can add while REQUESTED), refund |
| Returns Queue | `/dashboard/support/returns` | Status filter (`?status=`) |
| Return Details (staff) | `/dashboard/support/returns/detail?id=` | Only the next valid step is offered; reject/receive/refund ask for confirmation; refund button only for operations managers and admins; internal notes; customer and order cards |

Shared components: `components/returns/ReturnItemsTable.tsx` (items + refund total, same math as the backend) and `ReturnPhotos.tsx`.

Entry points: "Request a return" on delivered orders in My Orders, "My Returns" on the customer dashboard, "Returns" on the support, operations, and admin dashboards, and a Returns section in Customer Lookup.

---

## Deployment Notes
- Migration `...379` is already applied to RDS.
- **Not yet applied:** the S3 bucket policy change in `infra/s3.tf`. Until `terraform apply -target=aws_s3_bucket_policy.product_images_public_read` is run, evidence photos are publicly readable to anyone who has the link.
- Backend needs `npm install` for the new `@aws-sdk/s3-request-presigner` dependency (handled by the Docker build).

---

## Completion Checklist
- [x] The `returns` table has been created
- [x] The `return_items` table has been created
- [x] The `refunds` table has been created
- [x] Customers can request returns for eligible orders
- [x] Customers can upload return evidence
- [x] Return evidence is stored in Amazon S3
- [x] Support agents can review return requests
- [x] Returns can be approved or rejected
- [x] Refund records can be created
- [x] Return and refund statuses update correctly
- [x] Customers can view return history
- [x] Customers cannot access another customer's returns
- [x] Only authorized users can process refunds
- [x] The frontend successfully communicates with the backend return APIs

Verified through Postman (backend, 16 steps) and in the browser as a customer, a support agent, and an operations manager (frontend).

---

## Not Included in Phase 8
AI-assisted return review, incident management, business reports, role-specific dashboards, audit logs, operational monitoring, AI assistant, final AWS deployment.
