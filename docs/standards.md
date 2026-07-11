<!-- Phase 1 -->

# SmartCommerce — Code Standards

## Tech Stack

| Layer      | Technology                        |
|------------|-----------------------------------|
| Backend    | NestJS, TypeScript, Node.js       |
| Frontend   | Next.js (App Router), TypeScript  |
| UI         | Material UI (MUI)                 |
| Database   | PostgreSQL (Amazon RDS)           |
| Auth       | JWT (`@nestjs/jwt`, `passport-jwt`)|
| Validation | `class-validator`, `class-transformer` |
| ORM        | TypeORM                           |
| Cloud      | AWS (RDS, Secrets Manager, ECR, ECS Fargate, CloudWatch) |

---

## Naming Conventions

### General
| Thing              | Convention        | Example                     |
|--------------------|-------------------|-----------------------------|
| Files (backend)    | kebab-case        | `user.service.ts`           |
| Files (frontend)   | kebab-case        | `login-form.tsx`            |
| Classes            | PascalCase        | `UserService`               |
| Interfaces         | PascalCase        | `UserPayload`               |
| Types              | PascalCase        | `AuthTokenPayload`          |
| Functions/methods  | camelCase         | `findByEmail()`             |
| Variables          | camelCase         | `accessToken`               |
| Constants          | UPPER_SNAKE_CASE  | `JWT_EXPIRY`                |
| Enum names         | PascalCase        | `UserRole`                  |
| Enum values        | UPPER_SNAKE_CASE  | `SUPPORT_AGENT`             |
| Database tables    | snake_case        | `users`                     |
| Database columns   | snake_case        | `created_at`, `is_active`   |
| Environment vars   | UPPER_SNAKE_CASE  | `DATABASE_URL`              |

### Backend (NestJS) Suffixes
| Thing          | Suffix         | Example                  |
|----------------|----------------|--------------------------|
| Module         | `Module`       | `AuthModule`             |
| Controller     | `Controller`   | `AuthController`         |
| Service        | `Service`      | `UserService`            |
| Repository     | `Repository`   | `UserRepository`         |
| Guard          | `Guard`        | `JwtAuthGuard`           |
| Strategy       | `Strategy`     | `JwtStrategy`            |
| Interceptor    | `Interceptor`  | `LoggingInterceptor`     |
| Filter         | `Filter`       | `HttpExceptionFilter`    |
| Pipe           | `Pipe`         | `ValidationPipe`         |
| Decorator      | camelCase      | `@currentUser()`         |
| DTO (input)    | `Dto`          | `CreateUserDto`          |
| Entity         | `Entity`       | `UserEntity`             |

### Frontend (Next.js) Suffixes
| Thing          | Suffix         | Example                  |
|----------------|----------------|--------------------------|
| Page component | none           | `page.tsx` (App Router)  |
| Layout         | none           | `layout.tsx`             |
| React component| PascalCase     | `LoginForm.tsx`          |
| Custom hook    | `use` prefix   | `useAuth.ts`             |
| Context        | `Context`      | `AuthContext.tsx`        |
| Type/interface | none           | `UserProfile.ts`         |
| API client fn  | camelCase      | `loginUser.ts`           |

---

## Backend Folder Structure

```
api/
└── src/
    ├── auth/
    │   ├── dto/
    │   ├── guards/
    │   ├── strategies/
    │   ├── decorators/
    │   ├── auth.controller.ts
    │   ├── auth.service.ts
    │   └── auth.module.ts
    ├── users/
    │   ├── dto/
    │   ├── entities/
    │   ├── users.controller.ts
    │   ├── users.service.ts
    │   └── users.module.ts
    ├── common/
    │   ├── decorators/
    │   ├── filters/
    │   ├── guards/
    │   ├── interceptors/
    │   └── pipes/
    ├── config/
    │   └── configuration.ts
    ├── app.module.ts
    └── main.ts
```

Each feature gets its own module folder. No code outside its feature folder except in `common/` or `config/`.

---

## Frontend Folder Structure

```
frontend/
└── src/
    ├── app/                  # Next.js App Router pages
    │   ├── (auth)/
    │   │   ├── login/
    │   │   └── register/
    │   ├── dashboard/
    │   └── layout.tsx
    ├── components/           # Reusable UI components
    │   ├── auth/
    │   └── ui/
    ├── hooks/                # Custom React hooks
    ├── lib/                  # API clients, utilities
    │   └── api/
    ├── types/                # Shared TypeScript types
    └── styles/               # Global styles / theme
```

---

## TypeScript Rules

- `strict: true` always — no exceptions.
- Never use `any`. Use `unknown` when the type is truly unknown, then narrow it.
- Prefer `interface` for object shapes. Use `type` for unions, intersections, and aliases.
- Never use non-null assertion (`!`) unless you can prove it's safe with a comment.
- Export types and interfaces from a feature's `index.ts` or a dedicated `types/` file.

---

## Backend Rules

### Validation
- Every controller input (body, query, param) must have a DTO with `class-validator` decorators.
- Enable `ValidationPipe` globally with `whitelist: true` and `forbidNonWhitelisted: true`.
- Never trust raw request data inside a service.

### Error Handling
- Throw NestJS built-in HTTP exceptions (`NotFoundException`, `UnauthorizedException`, etc.).
- Use a global `HttpExceptionFilter` to shape all error responses consistently.
- Never expose stack traces or internal error messages to the client.

### API Response Shape
All API responses must follow this shape:

```typescript
// Success
{ data: T, message?: string }

// Error (handled by global filter)
{ statusCode: number, message: string, error: string }
```

### Logging
- Use `Logger` from `@nestjs/common` — never `console.log`.
- Instantiate per-class: `private readonly logger = new Logger(UserService.name)`.

### Security
- Passwords: hash with `bcrypt`, minimum 10 salt rounds. Never store plaintext.
- JWT: short-lived access tokens. Secret from environment variable only.
- Never return password hash or sensitive fields from any API response.
- Apply `@UseGuards(JwtAuthGuard)` on all protected endpoints.

### Environment & Config
- Use `@nestjs/config` with a `config/configuration.ts` factory.
- Locally: `.env` file (gitignored).
- Production: AWS Secrets Manager.
- All config values accessed via `ConfigService` — never `process.env` directly in services.

---

## Frontend Rules

- Use Next.js App Router — no Pages Router.
- Fetch data in Server Components where possible; use Client Components only when interactivity requires it. Mark with `'use client'` explicitly.
- Store auth tokens in `httpOnly` cookies — never `localStorage`.
- All API calls go through functions in `src/lib/api/` — no raw `fetch` scattered in components.
- MUI components only for UI — no inline styles, no custom CSS unless MUI cannot achieve it.
- Form validation on the frontend mirrors backend DTO rules (don't skip client-side validation).

---

## Git & File Hygiene

- `.env` is always gitignored.
- No `TODO` comments committed to main — open a task instead.
- No commented-out code committed.
- One feature per branch.
