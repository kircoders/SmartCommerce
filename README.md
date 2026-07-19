# SmartCommerce

A multi-role ecommerce operations platform, built phase by phase — auth, product catalog, inventory management, and shopping cart/checkout are done so far.

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | NestJS + TypeScript |
| Frontend | Next.js (App Router) + TypeScript + Material UI |
| Database | PostgreSQL (Amazon RDS) |
| ORM | TypeORM |
| Auth | JWT (`@nestjs/jwt`, `passport-jwt`) |
| Cloud | AWS App Runner (backend), AWS Amplify (frontend), Secrets Manager, S3, SSM |
| API Docs | Swagger/OpenAPI, interactive UI at `/api/docs` |

See `docs/standards.md` for naming conventions and folder structure.

## Project Structure

```
SmartCommerce/
├── api/          # NestJS backend
├── frontend/     # Next.js frontend
├── infra/        # Terraform + deployment scripts
└── docs/         # Phase specs and coding standards
```

## Roles

Five roles exist: `CUSTOMER`, `SUPPORT_AGENT`, `WAREHOUSE_OPERATOR`, `OPERATIONS_MANAGER`, `ADMIN`. Each has its own dashboard and route-level access is enforced on both the frontend (redirect) and backend (`RolesGuard`, the actual security boundary).

## What's Built So Far

- **Phase 1 — Auth & User Management**: registration, login, JWT auth, role-based dashboards, profile management.
- **Phase 2 — Product Catalog**: browse/search products (any logged-in role), admin CRUD + image upload to S3, live stock badges.
- **Phase 3 — Inventory Management**: stock tracking, audited adjustments with full history, low-stock detection — restricted to `WAREHOUSE_OPERATOR`/`OPERATIONS_MANAGER`/`ADMIN`.
- **Phase 4 — Shopping Cart & Checkout**: customers add products to a cart (validated against real stock), edit quantities, review at checkout. No order is created yet — that's Phase 5.

Each phase has a detailed spec in `docs/phase-N.md`, including database tables, API endpoints, and a completion checklist.

## Running Locally

Requires AWS CLI configured (this app connects to the real RDS database and S3 bucket even when running locally — there's no local/offline database).

**Easiest way** — from the repo root:
```
local-dev.bat
```
This checks/starts RDS if it's paused, then launches the backend (`localhost:3000`) and frontend (`localhost:3001`) each in their own window.

**Manually:**
```bash
cd api && npm install && npm run start:dev    # backend
cd frontend && npm install && npm run dev     # frontend
```

By default the frontend points at the deployed App Runner API. To point it at your local backend instead, copy `frontend/.env.local.example` to `frontend/.env.local` (gitignored) — see that file for details.

## API Docs

Once the backend is running: **`http://localhost:3000/api/docs`** — every route across all phases, grouped by tag, with a working "Authorize" button (paste a JWT from a login response) so you can try requests directly in the browser instead of Postman.

## Infrastructure Scripts

All in `infra/` (double-click the `.bat` versions, or run the `.ps1` files directly):

| Script | What it does |
|---|---|
| `up.ps1` / `up.bat` | Starts RDS + resumes App Runner |
| `down.ps1` / `down.bat` | Pauses App Runner + stops RDS (cuts idle cost to pennies/month) |
| `deploy.ps1` / `deploy.bat` | Builds the backend Docker image, pushes to ECR, redeploys App Runner |

**Important asymmetry**: the frontend redeploys automatically on every `git push` (Amplify watches the repo). The backend does **not** — `deploy.ps1`/`deploy.bat` must be run manually after backend changes for them to go live.

See `infra/DEPLOYED-URLS.txt` for the live URLs.

## Database Migrations

```bash
cd api
npm run migration:run       # apply pending migrations
npm run migration:revert    # roll back the last one
npm run migration:generate  # generate a new one from entity changes
```
