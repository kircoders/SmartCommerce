# Phase 6: Shipping & Warehouse Fulfillment

## Goal
Build the shipping and fulfillment system that allows warehouse operators to process customer orders after they are placed.

This phase connects orders to shipments and allows warehouse users to update shipment progress from creation to delivery.

At the end of this phase, each placed order has a shipment record, warehouse operators can manage shipment status, and customers can track shipment progress from their order details.

---

## Why This Comes Next
After an order is created, the business must fulfill it. Shipments depend on existing orders and order items, and customers shouldn't request returns or file shipment complaints until the system can show shipment status.

This phase provides the foundation for warehouse fulfillment, shipment tracking, delivery confirmation, return eligibility, shipment-related support complaints, and operational incident tracking.

---

## Tech Stack
Same as every phase — **not** Spring Boot/Java/Tailwind (the original draft of this doc incorrectly specified those).

| Layer | Technology |
|---|---|
| Backend | NestJS + TypeScript |
| Frontend | Next.js + TypeScript + Material UI |
| Database | PostgreSQL (Amazon RDS) |
| ORM | TypeORM |
| Auth | JWT, `JwtAuthGuard` + `RolesGuard` |
| Cloud | AWS App Runner (backend), Amplify (frontend), Secrets Manager |
| API Docs | Swagger/OpenAPI at `/api/docs` |

No SQS — shipments are created directly inside the order-placement transaction (the simpler option the spec allows).

---

## Database Tables

As built (migration `1782777011375-CreateShipments`):

```sql
shipments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id        UUID NOT NULL UNIQUE REFERENCES orders(id),
  status          VARCHAR(20) NOT NULL DEFAULT 'CREATED',
  tracking_number VARCHAR(100),
  shipped_date    TIMESTAMP,
  delivered_date  TIMESTAMP,
  created_at      TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMP NOT NULL DEFAULT NOW()
)
```

Shipment statuses: `CREATED`, `PACKED`, `SHIPPED`, `DELIVERED`.

**Relationships:**
- Each shipment belongs to one order; `UNIQUE (order_id)` enforces one shipment per order.
- Customers can view shipments only for their own orders. Warehouse users manage fulfillment.

---

## API Endpoints

### Warehouse Shipments (`/api/warehouse/shipments`) — WAREHOUSE_OPERATOR, OPERATIONS_MANAGER, ADMIN
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/warehouse/shipments?status=` | Shipment queue, oldest first, optionally filtered by status |
| GET | `/api/warehouse/shipments/:id` | One shipment, with its order |
| PATCH | `/api/warehouse/shipments/:id/status` | Update status (also syncs the order's status) |
| PATCH | `/api/warehouse/shipments/:id/tracking` | Set the tracking number |

### Customer Shipment Tracking — CUSTOMER only
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/orders/:orderId/shipment` | Shipment for one of the caller's own orders (`404` otherwise) |

---

## Feature Specs

### Shipment creation
`OrdersService.placeOrder()` creates one `CREATED` shipment in the same transaction as the order, so an order can never exist without one.

### Status updates and order sync
`ShipmentsService.updateStatus()` sets `shipped_date` on `SHIPPED` and `delivered_date` on `DELIVERED`, then updates the order:

| Shipment | Order |
|---|---|
| CREATED | PROCESSING |
| PACKED | PROCESSING |
| SHIPPED | SHIPPED |
| DELIVERED | DELIVERED |

Shipment status, order status, and inventory all update in one transaction, with the shipment row locked. `DELIVERED` is final — any further status change returns `400`, so stock can never be removed twice.

Known gaps:
- No other transition validation — e.g. `SHIPPED` → `CREATED` is allowed.
- A newly placed order stays `PLACED` (not `PROCESSING`) until the warehouse first changes the shipment status.

### Shipment details
The warehouse detail endpoint loads the shipment and its order only. The spec also asks for customer information and purchased products/quantities, which are not loaded yet.

### Inventory finalization after delivery
On delivery, `quantity_reserved` and `quantity_total` both decrease by each order item's quantity; `quantity_available` stays the same (it was already reduced when the order was placed).

---

## Frontend Screens

| Screen | Route | Notes |
|---|---|---|
| Warehouse Dashboard | `/dashboard/warehouse` | Warehouse landing page |
| Shipments | `/dashboard/warehouse/shipments` | Queue with status filter |
| Shipment Details | `/dashboard/warehouse/shipments/detail` | Status and tracking-number updates |
| Order Details (customer) | `/orders` (expanded row) | Shipment status, tracking number, shipped/delivered dates — fetched lazily when a row is expanded |

Warehouse pages redirect roles other than `WAREHOUSE_OPERATOR`/`OPERATIONS_MANAGER`/`ADMIN`.

---

## Completion Checklist
- [x] `shipments` table created
- [x] Each new order has a shipment record
- [x] Shipment records start with `CREATED` status
- [x] Warehouse users can view the shipment queue
- [~] Warehouse users can open shipment details (customer info and products not included)
- [x] Warehouse users can update shipment status
- [x] Shipped date is stored when marked shipped
- [x] Delivered date is stored when marked delivered
- [x] Related order status updates when shipment status changes
- [x] Customers can view shipment tracking inside Order Details
- [x] Customers cannot view shipments for other customers' orders
- [x] Customers cannot update shipment status
- [x] Warehouse operators, operations managers, and admins can manage shipments
- [x] Inventory is finalized after delivery
- [x] The frontend successfully communicates with the backend shipment APIs

---

## Not Included in Phase 6
Real carrier integration, payment processing, support tickets, shipment complaints, returns, refunds, AI assistant, reports, full dashboards, audit logs, incident management.
