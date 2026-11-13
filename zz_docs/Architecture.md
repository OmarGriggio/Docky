# 2 - Architecture

How Docky is built, as of 2026-11-13. The details and the rules to follow live in [CLAUDE.md](../CLAUDE.md); the trade-offs behind each choice in [Decisions.md](Decisions.md).

## 2.1 - General choices

| Decision       | Choice                                   | Justification                                                          |
| -------------- | ---------------------------------------- | ---------------------------------------------------------------------- |
| Frontend       | Angular 21 (zoneless), PrimeNG, Tailwind | Familiar framework, an architecture suited to business apps            |
| Backend        | Node.js + Express 5 + TypeScript         | Lightweight, widely used REST API                                      |
| Database       | PostgreSQL                               | Relational, suited to invoicing data                                   |
| Data access    | Raw SQL through a repository layer, no ORM | Full control over the queries, a simple stack                        |
| Authentication | JWT access token + revocable refresh token in an `httpOnly` cookie | Standard for a REST API, sessions can be revoked |
| Files          | MinIO (S3 API)                           | Logos and job site attachments, same API as S3                         |
| Deployment     | Docker Compose, Nginx, GitHub Actions    | Reproducible environment, push to `main` tests and deploys             |

## 2.2 - Backend

One folder per domain, not one folder per layer:

```
backend/src/modules/<domain>/<name>.routes.ts      → URL + middlewares
                             <name>.controller.ts  → reads the request, sends the response
                             <name>.service.ts     → business rules
                             <name>.repository.ts  → SQL
                             <name>.types.ts
backend/src/pdf/      → PDFs and Swiss QR-bills
backend/src/shared/   → config (DB, transactions), middlewares (auth, roles, rate limits),
                        errors, storage, migrations, notifications
```

- **Multi-tenant**: every query on a record is scoped by the caller's `company_id`, taken from the token.
- **Transactions**: `withTransaction()` keeps the connection in `AsyncLocalStorage`; repositories query through `db()`, so a service just wraps its body.
- **Errors**: services throw typed errors (`NotFoundError`, `ConflictError`...), one middleware turns them into HTTP responses.
- **Migrations**: numbered SQL files in `zz_migrations/`, applied at startup.
- **Pure logic** (totals, deposits, the client import's rules...) lives in small functions without I/O, unit-tested.

## 2.3 - Frontend

```
frontend/src/app/features/   → one folder per page/feature, every route lazy-loaded
frontend/src/app/shared/     → models, services, shared components, guards, utils, global styles
```

- State in signals; FR/EN text through Transloco; one breakpoint for the phone layout.
- The frontend locks what the backend would refuse anyway - the backend is the real rule.

## 2.4 - Tests

- Unit tests (Vitest) on pure functions, both sides.
- Backend integration tests: Supertest against the whole API and a throwaway Postgres (Testcontainers).
- CI runs both before every deploy.
