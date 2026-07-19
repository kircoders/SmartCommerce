# Phase 4: Shopping Cart & Checkout

## Goal
Build the shopping cart and checkout functionality that allows customers to select products, manage cart contents, review their purchase, and prepare an order. Products can only be added to the cart if sufficient inventory is available.

At the end of this phase, customers can browse products, add them to a cart, modify quantities, remove products, and review a checkout confirmation screen. **No order records are created** — that's Phase 5.

---

## Why This Comes Next
After products and inventory exist, customers need a way to select items before placing an order. The cart is a temporary workspace for reviewing intended purchases before confirming them. Separating cart from order creation keeps this phase lightweight and avoids holding inventory hostage for abandoned carts — real inventory reservation only happens once an order is actually created (Phase 5).

---

## Tech Stack
Same as every phase — **not** Spring Boot/Java/Tailwind (an earlier draft of this doc, like Phase 3's, incorrectly specified those).

| Layer | Technology |
|---|---|
| Backend | NestJS + TypeScript |
| Frontend | Next.js + TypeScript + Material UI |
| Database | PostgreSQL (Amazon RDS) |
| ORM | TypeORM |
| Auth | JWT, `JwtAuthGuard` + `RolesGuard`, locked to `CUSTOMER` only |
| Cloud | AWS App Runner (backend), Amplify (frontend), Secrets Manager |
| API Docs | Swagger/OpenAPI at `/api/docs`, added this phase, covers all 4 phases |

---

## Database Tables

```sql
carts (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id  UUID NOT NULL REFERENCES users(id),
  status       VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
  created_at   TIMESTAMP NOT NULL DEFAULT now(),
  updated_at   TIMESTAMP NOT NULL DEFAULT now()
)
-- partial unique index enforces one ACTIVE cart per customer:
CREATE UNIQUE INDEX idx_carts_one_active_per_customer
  ON carts(customer_id) WHERE status = 'ACTIVE';

cart_items (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cart_id      UUID NOT NULL REFERENCES carts(id) ON DELETE CASCADE,
  product_id   UUID NOT NULL REFERENCES products(id),
  quantity     INTEGER NOT NULL,
  unit_price   NUMERIC(10, 2) NOT NULL,
  created_at   TIMESTAMP NOT NULL DEFAULT now(),
  updated_at   TIMESTAMP NOT NULL DEFAULT now(),
  UNIQUE (cart_id, product_id)
)
```

**Relationships:**
- `carts.customerId` → one customer can have many carts over time, but only one `ACTIVE` at once (enforced by the partial index, not application code alone).
- `cart_items.cartId` → cascades on delete. `cart_items.productId` → does **not** cascade (deleting a product cleans up referencing cart items explicitly, see below).
- `cart_items.unitPrice` is a **snapshot**, captured once at add-time — not a live join to `products.price`.
- No `customerId` on `cart_items` (reachable via `cart` — normalization) and no per-item status (that lives on the parent `cart`, since a whole cart checks out together, never individual items).

---

## API Endpoints

### Cart (`/api/cart`) — CUSTOMER only
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/cart` | Get (or auto-create) the caller's active cart |
| POST | `/api/cart/items` | Add a product — merges quantity if already present, validates stock |
| PUT | `/api/cart/items/:id` | Update an item's quantity |
| DELETE | `/api/cart/items/:id` | Remove one item |
| DELETE | `/api/cart` | Empty the cart (keeps the cart row itself) |

### Checkout (`/api/checkout`) — CUSTOMER only
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/checkout` | Read-only checkout summary (same data as `GET /cart`) |
| POST | `/api/checkout/validate` | Re-check every cart item against *current* stock — read-only, creates nothing |

**Employees (any role other than `CUSTOMER`) get a `403` on every route above** — confirmed via direct testing, not just guard configuration.

---

## Feature Specs

### Find-or-create active cart
Every cart operation resolves the caller's active cart first (`WHERE customerId = X AND status = 'ACTIVE'`), creating one if none exists. The partial unique index guarantees this stays safe even under concurrent requests.

### Add to cart
Validates the product exists (reuses `ProductsService.findOne()`), checks the *total* desired quantity (existing + new) against current stock, and either bumps an existing row's quantity or creates a new one with a frozen `unitPrice`.

### Ownership enforcement
Every item-level operation (`update`, `remove`) confirms the item's parent cart belongs to the caller before touching it — returns `404`, not `403`, on a mismatch, so a customer can't even confirm another customer's item ID is valid.

### Checkout validation
Re-checks stock for every item in the cart in one batched query, returns `{ valid, issues[] }` without modifying anything. This is what the frontend calls before showing a "you're good to go" or "sorry, someone bought the last one" state.

### The product-deletion / cart collision (found and fixed this phase)
Deleting a product that's sitting in someone's cart would fail with a foreign key violation, same class of bug Phase 3 hit with inventory. Fixed by wiring `ProductsService.remove()` to call `CartService.removeProductFromCarts()` first — required a genuine circular module dependency (`ProductsModule` ↔ `CartModule`), resolved with NestJS's `forwardRef()` on both sides.

---

## Frontend Screens

| Screen | Route | Notes |
|---|---|---|
| Product detail popup | `/products` (dialog) | Gains a quantity selector + "Add to Cart" button (`CUSTOMER` only) |
| Cart | `/cart` | Table: product, price, editable quantity, line total, remove — plus grand total, Clear Cart, Proceed to Checkout |
| Checkout | `/checkout` | Read-only version of the same table, runs `validateCheckout` on load, surfaces stock issues per-line, "Confirm Order" is an honest dead end (Phase 5) |

Both `/cart` and `/checkout` are gated to `CUSTOMER` — other roles get redirected to their own dashboard, matching the backend's role lock.

---

## Completion Checklist
- [x] `carts` table created
- [x] `cart_items` table created
- [x] Customers automatically receive an active cart
- [x] Customers can add products to their cart
- [x] Customers can update item quantities
- [x] Customers can remove products from their cart
- [x] Customers can clear their cart
- [x] Cart totals are calculated correctly
- [x] Inventory availability is validated before items are added
- [x] Customers can review their order on the checkout page
- [x] Employees cannot modify customer shopping carts
- [x] The frontend successfully communicates with the backend shopping cart APIs
