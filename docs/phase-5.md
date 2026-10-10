# Phase 5: Order Management

## Goal
Build the order management system that allows customers to place orders from their cart, view order history, view order details, and cancel eligible orders.

This phase turns the customer's checkout review into a real order record. It connects cart, product, inventory, and customer data into the first complete business transaction in the platform.

At the end of this phase, customers can confirm checkout, create an order, view their orders, and cancel orders that have not moved too far in the fulfillment process.

---

## Why This Comes Next
After customers can add items to a cart and review checkout, the next step is to officially place the order. Order management must come before shipments, returns, refunds, and support because those features all depend on an existing order.

This phase provides the foundation for order history, order details, order status tracking, inventory reservation, and future shipments, returns, refunds, and order-linked support tickets.

---

## Tech Stack
Same as every phase — **not** Spring Boot/Java/Tailwind (the original draft of this doc, like Phases 3 and 4, incorrectly specified those).

| Layer | Technology |
|---|---|
| Backend | NestJS + TypeScript |
| Frontend | Next.js + TypeScript + Material UI |
| Database | PostgreSQL (Amazon RDS) |
| ORM | TypeORM |
| Auth | JWT, `JwtAuthGuard` + `RolesGuard`, locked to `CUSTOMER` only |
| Cloud | AWS App Runner (backend), Amplify (frontend), Secrets Manager |
| API Docs | Swagger/OpenAPI at `/api/docs` |

Amazon SQS (background shipment creation) is optional and not used — see Phase 6.

---

## Database Tables

As built (migration `1782777011372-CreateOrders`, with `cart_id` later dropped by `1782777011374-CartsTemporaryRemoveOrderCartId`):

```sql
orders (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id   UUID NOT NULL REFERENCES users(id),
  status        VARCHAR(20) NOT NULL DEFAULT 'PLACED',
  total_amount  NUMERIC(10, 2) NOT NULL,
  created_at    TIMESTAMP NOT NULL DEFAULT NOW(),   -- doubles as the placed date
  updated_at    TIMESTAMP NOT NULL DEFAULT NOW()
)
CREATE INDEX idx_orders_customer_id ON orders(customer_id);

order_items (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id      UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id    UUID NOT NULL REFERENCES products(id),
  product_name  VARCHAR(255) NOT NULL,              -- snapshot
  quantity      INTEGER NOT NULL,
  unit_price    NUMERIC(10, 2) NOT NULL,            -- snapshot
  created_at    TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE (order_id, product_id)
)
CREATE INDEX idx_order_items_order_id ON order_items(order_id);
```

Order statuses: `PLACED`, `PROCESSING`, `SHIPPED`, `DELIVERED`, `CANCELLED`.

**Relationships:**
- Each order belongs to one customer and contains one or more order items.
- Each order item belongs to one product, and stores the product's price **and name** at the time of purchase, so order history stays accurate if the product is later renamed or deleted.
- Each order is created from the customer's active cart. The cart is **deleted** after the order is placed (carts are temporary), which is why `orders.cart_id` was dropped.

**Differences from the original spec:**
- No `cancelled_at` column yet (needed for cancellation).
- No stored `line_total` — computed as `quantity × unit_price`.
- No separate `placed_at` — `created_at` is used.

---

## API Endpoints

### Orders (`/api/orders`) — CUSTOMER only
| Method | Endpoint | Description | Status |
|---|---|---|---|
| POST | `/api/orders` | Place an order from the caller's active cart (no request body) | Built |
| GET | `/api/orders` | List the caller's own orders, newest first, with items | Built |
| GET | `/api/orders/:id` | Get one of the caller's own orders, with items | Built |
| PATCH | `/api/orders/:id/cancel` | Cancel an eligible order | **Not built** |

---

## Feature Specs

### Place order
`OrdersService.placeOrder()` runs in one database transaction:
1. Load the customer's active cart; reject with `400` if missing or empty.
2. Re-check every item against current `quantity_available`.
3. Calculate the total from the cart items' frozen unit prices.
4. Create the order and its order items.
5. Reserve stock for each item (see below).
6. Delete the cart (cart items cascade).
7. Create a `CREATED` shipment for the order (Phase 6).

It reads carts and inventory directly through the transaction manager rather than calling `CartService`/`InventoryService`, since those don't accept a transaction manager.

### Inventory reservation
Placing an order moves each item's quantity from `quantity_available` to `quantity_reserved`, leaving `quantity_total` unchanged (total = available + reserved). The stock leaves `quantity_total` only on delivery (Phase 6). No `inventory_adjustments` audit row is written yet.

Orders placed before reservation was added have nothing reserved; delete that test data rather than delivering those orders.

### Ownership enforcement
All lookups filter by `customerId`, so another customer's order returns `404`.

### Order cancellation — not built
An order is eligible if it has not shipped (`PLACED` or `PROCESSING`). Cancelling should set status `CANCELLED`, set `cancelled_at`, release reserved inventory, and reject a second cancellation.

---

## Frontend Screens

| Screen | Route | Notes |
|---|---|---|
| Checkout confirmation | `/checkout` | "Confirm Order" now calls `POST /api/orders` |
| Order confirmation | `/order-confirmation` | Order number, date, status, items, total |
| My Orders + Order Details | `/orders` | Order list; each row expands to show items, prices, totals (and shipment tracking, Phase 6). No separate details page. |

No cancel button yet.

---

## Completion Checklist
- [x] `orders` table created
- [x] `order_items` table created
- [x] Customers can place orders from their cart
- [x] Empty carts cannot be submitted as orders
- [x] Inventory availability is checked before order creation
- [x] Inventory is reserved when an order is placed
- [x] Order totals are calculated correctly
- [x] Order items store the correct purchase price
- [x] Customer carts are closed or cleared after order placement (deleted)
- [x] Customers can view order confirmation
- [x] Customers can view order history
- [x] Customers can view order details
- [ ] Customers can cancel eligible orders
- [ ] Cancelled orders release reserved inventory
- [x] Customers cannot view another customer's order (cancel not built yet)
- [x] The frontend successfully communicates with the backend order APIs

---

## Not Included in Phase 5
Shipment creation and tracking, warehouse fulfillment, delivery confirmation, returns, refunds, support tickets, AI assistant, reports, dashboards, audit logs. (Shipment creation was pulled forward into `placeOrder()` as part of Phase 6.)
