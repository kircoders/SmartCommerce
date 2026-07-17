# Phase 3: Inventory Management

## Goal
Build the inventory management system that tracks product stock and allows warehouse users to manage inventory quantities. This phase connects products to real stock levels so the platform can later support carts, checkout, orders, and shipment fulfillment.

At the end of this phase, authorized internal users can view inventory, update product stock, record manual adjustments, and identify low-stock products.

---

## Why This Comes Next
Once products exist in the catalog, the system needs to know whether they're actually available. Inventory has to exist before checkout/orders (Phase 4+) so the platform can prevent customers from ordering unavailable products. This phase is the foundation for:
- Product availability
- Stock tracking
- Low-stock alerts
- Future stock reservations, order fulfillment, and warehouse operations

---

## Tech Stack
Matches the rest of the project — **not** Spring Boot/Java/Tailwind (an earlier draft of this doc incorrectly specified those).

| Layer | Technology |
|---|---|
| Backend | NestJS + TypeScript |
| Frontend | Next.js + TypeScript + Material UI |
| Database | PostgreSQL (Amazon RDS) |
| ORM | TypeORM |
| Auth | JWT, same `JwtAuthGuard` + `RolesGuard` pattern as Phase 2 |
| Cloud | AWS App Runner (backend), Amplify (frontend), Secrets Manager |

---

## Database Tables

```sql
inventory (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id          UUID NOT NULL UNIQUE REFERENCES products(id),
  quantity_available  INTEGER NOT NULL DEFAULT 0,
  quantity_reserved   INTEGER NOT NULL DEFAULT 0,
  quantity_total      INTEGER NOT NULL DEFAULT 0,
  low_stock_threshold INTEGER NOT NULL DEFAULT 0,
  updated_at          TIMESTAMP NOT NULL DEFAULT now()
)

inventory_adjustments (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id        UUID NOT NULL REFERENCES products(id),
  adjustment_type   VARCHAR(20) NOT NULL,   -- INCREASE | DECREASE | CORRECTION
  quantity_change   INTEGER NOT NULL,       -- signed: positive or negative
  reason            TEXT,
  adjusted_by       UUID NOT NULL REFERENCES users(id),
  created_at        TIMESTAMP NOT NULL DEFAULT now()
)
```

**Relationships:**
- `inventory.product_id` is **UNIQUE** — one inventory record per product (1-to-1), unlike `product_images` which was 1-to-many.
- `inventory_adjustments.product_id` — many adjustments can reference one product (audit trail, never edited/deleted after creation).
- `inventory_adjustments.adjusted_by` — references the user who made the change, same pattern as `products.created_by`.

---

## API Endpoints

| Method | Endpoint | Auth Required | Description |
|---|---|---|---|
| GET | `/api/inventory` | Yes (WAREHOUSE_OPERATOR, OPERATIONS_MANAGER, ADMIN) | List all inventory records |
| GET | `/api/inventory/:productId` | Yes (same 3 roles) | One product's inventory |
| PUT | `/api/inventory/:productId` | Yes (same 3 roles) | Update stock quantities / threshold |
| GET | `/api/inventory/low-stock` | Yes (same 3 roles) | Products at/below their threshold |
| POST | `/api/inventory/adjustments` | Yes (same 3 roles) | Record a manual stock adjustment |
| GET | `/api/inventory/:productId/adjustments` | Yes (same 3 roles) | Adjustment history for one product |

**Note the role scope is stricter than Phase 2's admin split:** in Phase 2, any logged-in role could at least *view* products (`products.controller.ts` had no `@Roles()` at all). Here, **CUSTOMER and SUPPORT_AGENT are blocked from every inventory endpoint, including reads** — inventory is internal-only, not customer-facing. Customers only ever see a derived "in stock / out of stock" flag on the product catalog, never raw quantities.

---

## Feature Specs

### Inventory record creation
Every product needs an inventory row before it can display availability. Simplest approach: create the `inventory` row automatically whenever `ProductsService.create()` runs (a product is never fully "created" without one), defaulting all quantities to 0.

### View inventory (`GET /api/inventory`, `GET /api/inventory/:productId`)
Returns product name (joined from `products`), available/reserved/total quantities, low-stock threshold, and last-updated timestamp.

### Update inventory (`PUT /api/inventory/:productId`)
Authorized users can set `quantityAvailable`, `quantityReserved`, `quantityTotal`, `lowStockThreshold` directly — this is a corrective/administrative update, separate from the audit-logged adjustment flow below.

### Record an adjustment (`POST /api/inventory/adjustments`)
This is the audited path for stock changes — increase, decrease, or correction, with a required reason and the adjusting user's ID (from `@CurrentUser()`, same pattern as `createdBy` in Phase 2 — never client-supplied). Applying an adjustment should update the corresponding `inventory` row's quantities in the same operation.

### Low-stock detection (`GET /api/inventory/low-stock`)
`WHERE quantity_available <= low_stock_threshold`.

### Product availability on the catalog
`products.controller.ts`'s public endpoints (`GET /products`, etc.) should include a derived availability flag (e.g. `inStock: quantityAvailable > 0`) by joining to `inventory` — customers see availability, never raw quantities or the adjustment history.

---

## Frontend Screens

| Screen | Route | Notes |
|---|---|---|
| Inventory list | `/inventory` | Protected — WAREHOUSE_OPERATOR, OPERATIONS_MANAGER, ADMIN only. Table: product name, available/reserved/total, threshold, last updated. |
| Product inventory detail | `/inventory/edit?id=` | Same query-param pattern as the Phase 2 admin product edit page (static export — no `[id]` dynamic segments). Update quantities/threshold, view adjustment history, submit a new adjustment. |
| Low stock view | `/inventory` (filtered) or `/inventory/low-stock` | TBD during build — likely a filter/tab on the main inventory list rather than a fully separate page, to avoid duplicating the table UI. |

Unlike Phase 2's `/products` (visible to any role) vs `/dashboard/admin/products` (admin-only) split, **all of Phase 3's frontend is one access tier** — warehouse/ops/admin all see and use the same inventory screens, with no separate "view-only" version for other roles (customers/support never see inventory at all, not even read-only).

---

## Backend Module Structure
```
api/src/inventory/
├── dto/
│   ├── update-inventory.dto.ts
│   └── create-adjustment.dto.ts
├── entities/
│   ├── inventory.entity.ts
│   └── inventory-adjustment.entity.ts
├── inventory.controller.ts
├── inventory.module.ts
└── inventory.service.ts
```
Mirrors the `products/` module structure from Phase 2. Reuses `common/guards/roles.guard.ts` and `common/decorators/roles.decorator.ts` as-is — no new auth infrastructure needed, just a different `@Roles(...)` list per route.

---

## Completion Checklist
- [ ] `inventory` table created via TypeORM migration
- [ ] `inventory_adjustments` table created via TypeORM migration
- [ ] Every product gets an inventory record on creation
- [ ] Authorized roles (WAREHOUSE_OPERATOR, OPERATIONS_MANAGER, ADMIN) can view inventory
- [ ] Authorized roles can update stock quantities
- [ ] Manual inventory changes are recorded in `inventory_adjustments`
- [ ] Low-stock products can be identified (`GET /api/inventory/low-stock`)
- [ ] Product catalog reflects availability (in stock / out of stock) derived from inventory
- [ ] CUSTOMER cannot access any inventory endpoint (not even read)
- [ ] SUPPORT_AGENT cannot access any inventory endpoint (not even read)
- [ ] WAREHOUSE_OPERATOR, OPERATIONS_MANAGER, ADMIN can all manage inventory
- [ ] Frontend inventory screens communicate with the backend inventory APIs
