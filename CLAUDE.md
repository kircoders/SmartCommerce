<!-- Phase 1 -->

# SmartCommerce — Claude Instructions

## Project Overview
SmartCommerce is a multi-role ecommerce operations platform.

**Backend:** NestJS + TypeScript — NO Spring Boot, no Java, ever.
**Frontend:** Next.js + TypeScript + React + Material UI
**Database:** PostgreSQL (Amazon RDS)
**Auth:** JWT
**Cloud:** AWS (RDS, Secrets Manager, ECR, ECS Fargate, CloudWatch)

Always read `docs/standards.md` before writing any code in this project.

---

## Non-Negotiables
- Never use Spring Boot or Java. The backend is NestJS only.
- Never use `any` in TypeScript — anywhere, ever.
- Never hardcode secrets, credentials, or environment-specific values.
- Never use `console.log` — use NestJS `Logger` in the backend.
- Always run in strict TypeScript mode.
- All DTOs must use `class-validator` decorators for validation.

---

## Project Structure

```
SmartCommerce/
├── api/          # NestJS backend
├── frontend/     # Next.js frontend
└── docs/         # Project documentation and standards
```

See `docs/standards.md` for detailed folder structure, naming rules, and code conventions.
