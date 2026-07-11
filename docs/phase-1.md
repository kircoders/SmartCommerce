<!-- Phase 1 -->

# Phase 1: Authentication & User Management

## Goal
Build the authentication foundation for SmartCommerce by implementing user accounts, authentication, authorization, and basic profile management.

At the end of this phase, authorized users can securely log in, access protected resources, and be redirected to the correct dashboard based on their role. No business functionality (products, orders, inventory, etc.) is implemented here.

---

## AWS Services
| Service | Purpose |
|---|---|
| Amazon RDS (PostgreSQL) | Stores user accounts and auth data |
| AWS Secrets Manager | Stores DB credentials, JWT secret (prod only) |
| Amazon ECR / ECS / Fargate | Container deployment (post-phase, not during dev) |
| Amazon CloudWatch | Log monitoring (post-deployment) |

Local development uses `.env` for credentials.

---

## Database Tables
Only one table is created this phase: `users`

```sql
users (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email           VARCHAR(255) UNIQUE NOT NULL,
  password_hash   VARCHAR(255) NOT NULL,
  first_name      VARCHAR(100) NOT NULL,
  last_name       VARCHAR(100) NOT NULL,
  role            VARCHAR(50) NOT NULL DEFAULT 'CUSTOMER',
  is_active       BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMP NOT NULL DEFAULT now(),
  updated_at      TIMESTAMP NOT NULL DEFAULT now()
)
```

---

## Roles
- `CUSTOMER`
- `SUPPORT_AGENT`
- `WAREHOUSE_OPERATOR`
- `OPERATIONS_MANAGER`
- `ADMIN`

---

## API Endpoints

### Auth
| Method | Endpoint | Auth Required | Description |
|---|---|---|---|
| POST | `/api/auth/register` | No | Register a new customer |
| POST | `/api/auth/login` | No | Login and receive JWT |
| POST | `/api/auth/logout` | Yes | Invalidate session |

### Profile
| Method | Endpoint | Auth Required | Description |
|---|---|---|---|
| GET | `/api/users/me` | Yes | Get current user profile |
| PUT | `/api/users/me` | Yes | Update current user profile |

---

## Feature Specs

### Registration (POST /api/auth/register)
- Validates all input fields
- Rejects duplicate email addresses with a clear error
- Hashes password with bcrypt (min 10 rounds) before storage
- Assigns `CUSTOMER` role automatically
- Sets `is_active = true` on creation
- Returns user info (no password hash)

### Login (POST /api/auth/login)
- Validates credentials
- Rejects login if `is_active = false`
- Generates and returns a JWT access token
- Response includes user info and a `redirectTo` field based on role:
  - `CUSTOMER` → `/dashboard/customer`
  - `SUPPORT_AGENT` → `/dashboard/support`
  - `WAREHOUSE_OPERATOR` → `/dashboard/warehouse`
  - `OPERATIONS_MANAGER` → `/dashboard/operations`
  - `ADMIN` → `/dashboard/admin`

### Logout (POST /api/auth/logout)
- Clears the auth token from the client (httpOnly cookie)
- Ends the authenticated session

### Profile (GET/PUT /api/users/me)
- Users can view all their profile fields
- Users can update: `first_name`, `last_name`, `email`
- Users cannot modify: `role`, `is_active`, `password_hash`, `id`, `created_at`, `updated_at`

---

## Frontend Screens
| Screen | Route | Notes |
|---|---|---|
| Login | `/login` | Public |
| Register | `/register` | Public, creates CUSTOMER accounts only |
| Profile | `/profile` | Protected |
| Dashboard (placeholder) | `/dashboard/*` | Protected, role-based routing |

Dashboard pages only need to confirm auth and role routing work — no business UI yet.

---

## Backend Module Structure
```
api/src/
├── auth/
│   ├── dto/           # RegisterDto, LoginDto
│   ├── guards/        # JwtAuthGuard
│   ├── strategies/    # JwtStrategy
│   ├── auth.controller.ts
│   ├── auth.service.ts
│   └── auth.module.ts
├── users/
│   ├── dto/           # UpdateProfileDto
│   ├── entities/      # UserEntity
│   ├── users.controller.ts
│   ├── users.service.ts
│   └── users.module.ts
├── common/
│   └── filters/       # HttpExceptionFilter
├── config/
│   └── configuration.ts
├── app.module.ts
└── main.ts
```

---

## Completion Checklist
- [ ] NestJS connects to PostgreSQL RDS
- [ ] `users` table created via TypeORM migration
- [ ] Customer registration works
- [ ] Passwords are hashed (bcrypt, min 10 rounds)
- [ ] Duplicate email registration is rejected
- [ ] Login returns a JWT
- [ ] Invalid credentials are rejected
- [ ] Inactive accounts cannot log in
- [ ] JWT guard protects authenticated routes
- [ ] Role-based redirect is returned on login
- [ ] Users can view their profile
- [ ] Users can update allowed profile fields only
- [ ] Frontend communicates with all backend auth APIs
- [ ] All 5 role dashboards render a placeholder page
