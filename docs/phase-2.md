# Phase 2: Product Catalog

## Goal
Build the product catalog: admins can create, edit, and manage products (with images); customers and staff can browse and search the catalog. Backend is complete — this phase's remaining work is the frontend.

At the end of this phase, the catalog is fully usable end to end: an admin can add a product with images from the UI, and any logged-in user can browse/search the live catalog.

---

## AWS Services
| Service | Purpose |
|---|---|
| Amazon RDS (PostgreSQL) | Stores `products` and `product_images` |
| Amazon S3 | Stores product image files |
| AWS Secrets Manager | DB credentials, JWT secret (prod only) |
| AWS App Runner | Hosts the backend API |

---

## Database Tables
```sql
products (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name         VARCHAR(255) NOT NULL,
  description  TEXT,
  price        NUMERIC(10,2) NOT NULL,
  is_active    BOOLEAN NOT NULL DEFAULT true,
  created_by   UUID NOT NULL REFERENCES users(id),
  created_at   TIMESTAMP NOT NULL DEFAULT now(),
  updated_at   TIMESTAMP NOT NULL DEFAULT now()
)

product_images (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id   UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  url          VARCHAR(2048) NOT NULL,
  s3_key       VARCHAR(1024) NOT NULL,
  is_primary   BOOLEAN NOT NULL DEFAULT false,
  created_at   TIMESTAMP NOT NULL DEFAULT now()
)
```

---

## API Endpoints — status: DONE (backend)

### Public / any logged-in user
| Method | Endpoint | Auth Required | Description |
|---|---|---|---|
| GET | `/api/products` | Yes (any role) | List all active products |
| GET | `/api/products/search?q=` | Yes (any role) | Search by name/description |
| GET | `/api/products/:id` | Yes (any role) | Get one product |

### Admin only
| Method | Endpoint | Auth Required | Description |
|---|---|---|---|
| POST | `/api/admin/products` | Yes (ADMIN) | Create a product |
| PUT | `/api/admin/products/:id` | Yes (ADMIN) | Update a product |
| DELETE | `/api/admin/products/:id` | Yes (ADMIN) | Delete a product (+ its images) |
| POST | `/api/admin/products/:id/images` | Yes (ADMIN) | Upload a product image |
| DELETE | `/api/admin/products/:id/images/:imageId` | Yes (ADMIN) | Delete a product image |

---

## Frontend Screens — status: NOT STARTED

| Screen | Route | Notes |
|---|---|---|
| Catalog browse | `/products` | Protected (any role). Grid/list of active products, primary image, name, price. |
| Product detail | `/products/[id]` | Protected. Full description, all images, price. |
| Admin product list | `/dashboard/admin/products` | Protected (ADMIN). Table of all products with edit/delete actions. |
| Admin create product | `/dashboard/admin/products/new` | Protected (ADMIN). Form + image upload. |
| Admin edit product | `/dashboard/admin/products/[id]/edit` | Protected (ADMIN). Same form, pre-filled; manage images (add/remove/set primary). |

Follows the same auth pattern as `/profile` and the existing dashboard pages — `useAuth` hook + redirect if unauthenticated/wrong role.

---

## Feature Specs

### Catalog browse (`/products`)
- Fetches `GET /api/products` on load.
- Each card shows the primary image (fallback placeholder if none), name, price.
- Search box calls `GET /api/products/search?q=` and replaces the list.
- Clicking a card navigates to `/products/[id]`.

### Product detail (`/products/[id]`)
- Fetches `GET /api/products/:id`.
- Shows all images (not just primary), full description, price.
- 404 → simple "product not found" state.

### Admin product list (`/dashboard/admin/products`)
- Only reachable by `ADMIN` role (mirror the role-gating already used for `/dashboard/admin`).
- Table: name, price, active/inactive, edit + delete actions.
- Delete confirms before calling `DELETE /api/admin/products/:id`.

### Admin create/edit product
- Form fields: name, description, price, isActive — mirrors `CreateProductDto`/`UpdateProductDto` validation client-side (per `docs/standards.md`: "Form validation on the frontend mirrors backend DTO rules").
- On create: `POST /api/admin/products`, then redirect to edit view to add images (a product needs an ID before images can be attached).
- On edit: image manager showing existing images, upload new (`POST .../images`), delete (`DELETE .../images/:imageId`), and a way to mark one as primary.

---

## Frontend Module Structure
```
frontend/src/
├── app/
│   ├── products/
│   │   ├── page.tsx              # catalog browse
│   │   └── [id]/page.tsx         # product detail
│   └── dashboard/admin/products/
│       ├── page.tsx              # admin product list
│       ├── new/page.tsx          # create product
│       └── [id]/edit/page.tsx    # edit product + images
├── components/
│   └── products/
│       ├── ProductCard.tsx
│       ├── ProductForm.tsx
│       └── ProductImageManager.tsx
├── lib/api/
│   └── products.ts                # findAll, search, findOne, create, update, remove, uploadImage, deleteImage
└── types/
    └── product.ts                 # Product, ProductImage types (mirror backend entities)
```

All API calls go through `lib/api/products.ts` — no raw `fetch` in components, per `docs/standards.md`.

---

## Completion Checklist
- [x] `products` / `product_images` tables created via TypeORM migration
- [x] Public product endpoints (list, search, detail)
- [x] Admin product CRUD endpoints
- [x] Product image upload/delete endpoints (S3)
- [x] S3 bucket + IAM permissions provisioned (`infra/s3.tf`)
- [x] `lib/api/products.ts` API client
- [x] Catalog browse page renders live products
- [ ] Search works from the UI (backend endpoint tested directly; not yet clicked through in the frontend search box)
- [x] Product detail popup (built as a modal - "Buy"/"Close" - instead of a separate page, per updated design)
- [x] Admin product list page (view/edit/delete) - tested end to end
- [x] Admin create-product form works end to end - tested
- [ ] Admin can upload/delete/set-primary images from the UI (tested via Postman directly against the API; not yet confirmed via the actual edit-page UI)
- [ ] Non-admins cannot reach `/dashboard/admin/products/*` (frontend redirect + backend RolesGuard are both in place and RolesGuard was tested directly, but not yet confirmed by clicking through as a non-admin)
