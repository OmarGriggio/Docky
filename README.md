# Docky

A SaaS platform that helps small construction companies manage clients, suppliers, materials, quotes and invoices — instead of juggling spreadsheets and expensive, clunky software.

This is a personal project I'm building end-to-end to practice full-stack development with Angular, Node.js/Express and PostgreSQL, and to get comfortable with SaaS architecture (multi-company data, auth, layered backend design).

## Table of contents

- [About the project](#about-the-project)
- [Project status](#project-status)
- [Tech stack](#tech-stack)
- [Project structure](#project-structure)
- [Domain model](#domain-model)
- [API overview](#api-overview)
- [Getting started](#getting-started)
- [Documentation](#documentation)
- [Author](#author)

## About the project

Many small and medium construction businesses still handle their quotes and invoices with Excel files or expensive, hard-to-use software. Managing materials, suppliers and prices is often scattered across tools, which leads to mistakes, wasted time and poor tracking.

Docky aims to be a simple, focused SaaS where a construction company can:

- manage its clients and suppliers,
- keep a catalog of materials with supplier pricing,
- quickly build quotes and invoices,
- add materials and labor to a quote/invoice and get totals automatically,
- keep a history of past invoices.

Three types of users are planned: **employees** (day-to-day usage), **company admins** (manage their company's data and staff) and a **platform admin** (manages the SaaS itself, subscriptions and companies). Full details are in [zz_docs/Project Definition.md](zz_docs/Project%20Definition.md).

## Project status

🚧 **Work in progress.** This is a solo learning project built incrementally, not a finished product. Here's an honest snapshot of what exists today:

**Backend**
- [x] Express + TypeScript API with a layered architecture (`controller` → `service` → `repository`)
- [x] JWT-based authentication, with rate limiting on login
- [x] CRUD endpoints for clients, suppliers, resources (materials/labor/subcontracting), resource pricing, documents (quotes and invoices) and invoice lines
- [x] PostgreSQL access via raw SQL (no ORM, by design — see [zz_docs/Architecture.md](zz_docs/Architecture.md))
- [x] Role/permission enforcement (`ADMIN` vs `USER` vs `PLATFORM_ADMIN` — see [zz_docs/Decisions.md](zz_docs/Decisions.md))
- [x] Multi-tenant data isolation between companies, and archive (soft-delete) instead of hard delete for business records
- [ ] Automated tests (Vitest is wired up and passing on both sides, but only covers a couple of pure functions so far — not real coverage yet)
- [ ] Database migrations (schema is currently created manually)

**Frontend**
- [x] Angular app skeleton with routing (every route lazy-loaded)
- [x] Client, supplier, project, document and resource list/form features wired to the API, with archive/restore
- [x] Authentication flow / login and registration screens
- [ ] Invoice and quote creation screens (listing exists, creation doesn't yet)
- [ ] Dashboard

**Ops**
- [x] Docker Compose setup for local dev; a separate, leaner production image (multi-stage `Dockerfile`, compiled, non-root) exists but isn't wired into a CI/CD pipeline yet
- [ ] Deployment

## Tech stack

| Layer            | Choice                       | Why                                                            |
| ---------------- | ---------------------------- | --------------------------------------------------------------- |
| Frontend         | Angular 21                   | Familiar framework with an architecture that fits business apps |
| Backend          | Node.js + Express + TypeScript | Lightweight, widely-used REST API stack                       |
| Database         | PostgreSQL                    | Robust, relational, fits business/invoicing data well            |
| Data access      | Raw SQL via a repository layer | Full control over queries, keeps the stack simple              |
| Authentication   | JWT                           | Standard, stateless auth for a REST API                         |
| Deployment       | Docker Compose (dev) / multi-stage `Dockerfile` (prod image) | Reproducible environment; CI/CD pipeline still to come |

## Project structure

```
Docky/
├── backend/                  # Express + TypeScript REST API
│   └── src/
│       ├── modules/          # One folder per domain (clients, suppliers,
│       │                     #   projects, documents, users, companies,
│       │                     #   catalog...), each with its own
│       │                     #   controller/service/repository/routes/types
│       ├── pdf/               # PDF & Swiss QR-bill generation
│       └── shared/
│           ├── middlewares/   # auth, roles, rate limiting
│           ├── types/         # typed HTTP errors
│           └── config/        # DB connection
├── frontend/                  # Angular application
│   └── src/app/
│       ├── shared/             # Shared models/components
│       └── features/           # Feature modules (clients, suppliers, documents...)
└── zz_docs/                    # Project specs, architecture & decisions log
```

## Domain model

The core entities and how they relate:

- **Company** — owns everything below; the tenant in this multi-company SaaS
- **User** — belongs to one company, has a role (employee/admin)
- **Client** — belongs to a company, can have several invoices
- **Supplier** — belongs to a company, provides priced resources
- **Resource** — a catalog item (material, labor, subcontracting or other), priced by one or more suppliers
- **Resource supplier price** — links a supplier, a resource and a price
- **Project** — a client's job site, optionally linked to a document
- **Document** — a quote or an invoice issued to a client, made of document lines
- **Document line** — a resource or a labor entry on a document

Full field-level definitions are in [zz_docs/Data Definition.md](zz_docs/Data%20Definition.md).

## API overview

All routes are prefixed by their resource name and return JSON. Most are protected by the JWT `authenticate` middleware.

| Resource               | Base path                  |
| ----------------------- | --------------------------- |
| Auth                    | `/auth/login`                |
| Users                   | `/user`                      |
| Clients                 | `/client`                    |
| Addresses               | `/address`                   |
| Suppliers               | `/supplier`                  |
| Resources               | `/resource`                  |
| Resource supplier prices | `/resource-supplier-price`  |
| Documents               | `/document`                  |
| Document lines          | `/document-line`             |
| Documents (with lines)  | `/document-complete`         |
| Companies               | `/company`                   |
| Projects                | `/project`                   |
| Project types           | `/project-type`              |
| Invoice PDF             | `/pdf/invoice/:id`           |

## Getting started

### Prerequisites

- Node.js (LTS)
- A running PostgreSQL instance

### Backend

```bash
docker compose up --build
```

The API starts on `http://localhost:3000`.

### Frontend

(Docker incoming...)

```bash
cd frontend
npm install
ng serve
```

The Angular app starts on `http://localhost:4200`.

### Environment variables

Two `.env` files are used, for two different consumers — copy both examples before running anything:

```bash
cp .env.example .env
cp backend/.env.example backend/.env
```

**Root `.env`** — read by `docker compose` itself, for variable substitution in [docker-compose.yml](docker-compose.yml):

| Variable                 | Description                          |
| ------------------------- | ------------------------------------ |
| `POSTGRES_VERSION`        | PostgreSQL Docker image tag          |
| `POSTGRES_CONTAINER_NAME` | Name of the Postgres container       |
| `POSTGRES_DB`             | Database created on first boot       |
| `POSTGRES_USER`           | Database user                        |
| `POSTGRES_PASSWORD`       | Database password                    |
| `POSTGRES_PORT`           | Host port mapped to Postgres' `5432` |
| `BACKEND_CONTAINER_NAME`  | Name of the backend container        |
| `BACKEND_PORT`            | Host port mapped to the API's `3000` |

**`backend/.env`** — loaded by the Express app itself at runtime:

| Variable      | Description                                                   |
| ------------- | --------------------------------------------------------------- |
| `DB_HOST`     | PostgreSQL host (`postgres`, the Compose service name)          |
| `DB_PORT`     | PostgreSQL port                                                  |
| `DB_USER`     | PostgreSQL user                                                  |
| `DB_PASSWORD` | PostgreSQL password                                              |
| `DB_NAME`     | PostgreSQL database name                                         |
| `JWT_SECRET`  | Secret used to sign/verify JWTs                                  |

> The database schema is bootstrapped automatically the first time the Postgres container starts, from the SQL files in [zz_migrations/](zz_migrations/) (mounted into `/docker-entrypoint-initdb.d`). To re-run them, drop the `postgres_data` volume and start the containers again. This also seeds a full sample dataset (a company, clients, projects, suppliers, a resource catalog, quotes/invoices...) so there's always something to explore right away — log in with **`admin@dedonnostyle.ch` / `password123`**.

## Documentation

The `zz_docs/` folder contains the detailed specs this project is built from:

- [Project Definition.md](zz_docs/Project%20Definition.md) — problem statement, user types, user journeys
- [Data Definition.md](zz_docs/Data%20Definition.md) — entities, fields, relations
- [Architecture.md](zz_docs/Architecture.md) — architecture decisions and folder conventions
- [Decisions.md](zz_docs/Decisions.md) — trade-off log for choices that had more than one reasonable option, with what was picked and what was turned down, and why
- [zz_docs/note/](zz_docs/note/) — personal notes taken while learning Express, npm, and setting up the dev environment

## Author

**Omar Griggio**
📧 omar.griggio@gmail.com
🔗 [github.com/OmarGriggio](https://github.com/OmarGriggio)

This project is built for learning purposes and as part of my portfolio — feedback is welcome.
