# Docky

A SaaS platform that helps small construction companies manage clients, a catalog of materials and services, quotes, job sites and invoices — instead of juggling spreadsheets and expensive, clunky software.

This is a personal project I'm building end-to-end to practice full-stack development with Angular, Node.js/Express and PostgreSQL, and to get comfortable with SaaS architecture (multi-company data, auth, layered backend design).

*Last updated: 27.10.2026*

## Live demo

🔗 **[https://179-237-86-113.sslip.io](https://179-237-86-113.sslip.io)**

A dedicated company, seeded with realistic sample data (clients, quotes, chantiers, invoices), is set up for anyone who wants to try it out:

- **Email**: `admin@demo.docky.ch`
- **Password**: `Demo2026!`

Feel free to click around !

## Table of contents

- [Live demo](#live-demo)
- [About the project](#about-the-project)
- [Project status](#project-status)
- [Roadmap](#roadmap)
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

- manage its clients,
- keep a catalog of resources (materials and services),
- quickly build quotes and invoices, with totals, discount and VAT computed automatically,
- turn an accepted quote into a job site ("chantier"), plan it on a calendar, then invoice it,
- print quotes, invoices and payment reminders as PDFs, invoices with a Swiss QR-bill,
- see at a glance which invoices are still waiting for their payment and which chantiers are ongoing,
- keep a history of past documents.

Three types of users are planned: **employees** (day-to-day usage), **company admins** (manage their company's data and staff) and a **platform admin** (manages the SaaS itself, subscriptions and companies). Full details are in [zz_docs/Project Definition.md](zz_docs/Project%20Definition.md).

## Project status

🚧 **Work in progress.** This is a solo learning project built incrementally, not a finished product. Here's an honest snapshot of what exists today:

**Backend**
- [x] Express + TypeScript API with a layered architecture (`controller` → `service` → `repository`)
- [x] JWT-based authentication, with rate limiting on login
- [x] CRUD endpoints for clients, projects, resources (materials/services), documents (quotes, invoices, a project's own resource ledger) and their lines
- [x] PostgreSQL access via raw SQL (no ORM, by design — see [zz_docs/Architecture.md](zz_docs/Architecture.md))
- [x] Role/permission enforcement (`ADMIN` vs `USER` vs `PLATFORM_ADMIN` — see [zz_docs/Decisions.md](zz_docs/Decisions.md))
- [x] Multi-tenant data isolation between companies, and archive (soft-delete) instead of hard delete for business records
- [x] Refresh token stored in an httpOnly cookie (not readable by frontend JS, mitigates XSS token theft)
- [x] Platform-admin company impersonation, login history/audit trail
- [x] Document lifecycle rules enforced server-side (only open documents editable, a completed chantier locked and invoiced once), multi-step writes in a single transaction
- [ ] Automated tests (Vitest is wired up and passing on both sides - 31 backend, 53 frontend - but only covers pure functions so far: totals, placeholders, PDF language and amount formatting, a few frontend helpers - not real coverage yet)
- [x] Database migrations (incremental, numbered files in `zz_migrations/`, auto-applied on backend startup)
- [x] Quote, invoice and payment reminder PDFs (invoices and reminders with a Swiss QR-bill), printed in the client's own language (French or English so far). Invoices and quotes share one layout modelled on a real company's own Excel invoices: header image and footer (address, bank, IBAN, website) on every page, a one-line-per-section summary on page 1, the detailed sections on the following pages
- [x] Early payment discount ("escompte"): rate, delay and minimum amount set once on the company, copied onto each new invoice and printed with it
- [x] Standalone Swiss QR-bill slip: a bare payment slip for any payer, rendered at its official size and copied to the clipboard to paste into Word/Excel
- [x] Quotes and invoices for a one-off recipient typed by hand, without creating a client first
- [x] Error tracking kept on our own server: every server error and every error a user's browser runs into is recorded, grouped (one row per distinct bug, with a counter), and listed for the platform admin, who marks them resolved - no third-party service, no personal data stored
- [x] Uptime monitoring: a public health check (database + file storage) watched by an external monitor
- [x] AI-assisted document scanner — extracts structured data (reference, project/building, address, amount) from an uploaded scanned document via an LLM (Infomaniak AI), to prefill a new invoice instead of retyping it by hand

**Frontend**
- [x] Angular app skeleton with routing (every route lazy-loaded)
- [x] Client, project, document and resource list/form features wired to the API, with archive/restore
- [x] Authentication flow / login and registration screens
- [x] Invoice and quote creation, with per-project resource prefill and default intro/conclusion templates
- [x] Dashboard: sent invoices still waiting for their payment (overdue first, with their total), ongoing chantiers, and the paid amount per client as a bar chart (`p-chart`/Chart.js)
- [x] Chantiers: resource ledger (read-only by default, with an explicit "Edit" mode), file attachments, calendar planning with free notes
- [x] Usable on a phone: bottom navigation bar, lists shown as cards, a week list calendar, and installable on the home screen (PWA). Mainly a desktop app - phone screens show and act on data, the heaviest editing stays on desktop
- [x] French and English UI (Transloco), per-user language setting

**Ops**
- [x] Docker Compose for local dev; separate multi-stage production images (compiled, non-root), deployed behind an Nginx gateway
- [x] Deployed — HTTPS via a free [sslip.io](https://sslip.io) hostname + Let's Encrypt (no domain purchased yet)
- [x] CI/CD: GitHub Actions runs backend/frontend tests and builds on every push to `main`, then auto-deploys over SSH if they pass

## Roadmap

What's planned next, roughly in that order:

- **Sending documents by email, straight from the app** — invoices, quotes and payment reminders sent to the client with their PDF attached, instead of downloading the PDF and attaching it by hand in a mail client.
- **Stock module** — keep track of the materials a company holds, what goes in and out, and what each chantier consumed from it.
- **Long-term purchase tracking** — record what the company buys over time (materials, supplies), to follow its spending and the prices it actually pays.

## Tech stack

| Layer            | Choice                       | Why                                                            |
| ---------------- | ---------------------------- | --------------------------------------------------------------- |
| Frontend         | Angular 21                   | Familiar framework with an architecture that fits business apps |
| Backend          | Node.js + Express + TypeScript | Lightweight, widely-used REST API stack                       |
| Database         | PostgreSQL                    | Robust, relational, fits business/invoicing data well            |
| Data access      | Raw SQL via a repository layer | Full control over queries, keeps the stack simple              |
| Authentication   | JWT                           | Standard, stateless auth for a REST API                         |
| Deployment       | Docker Compose (dev + prod), Nginx gateway, GitHub Actions CI/CD | Reproducible environment; push to `main` tests, builds and deploys automatically |

## Project structure

```
Docky/
├── backend/                  # Express + TypeScript REST API
│   └── src/
│       ├── modules/          # One folder per domain (clients, catalog,
│       │                     #   projects, documents, calendar, dashboard,
│       │                     #   document-scanner, users, companies, auth),
│       │                     #   each with its own
│       │                     #   controller/service/repository/routes/types
│       ├── pdf/               # PDF & Swiss QR-bill generation
│       └── shared/
│           ├── middlewares/   # auth, roles, rate limiting
│           ├── types/         # typed HTTP errors
│           ├── config/        # DB connection (+ transactions), S3 client
│           ├── storage/       # file storage (MinIO/S3)
│           └── ai/            # LLM client for the document scanner
├── frontend/                  # Angular application
│   └── src/app/
│       ├── shared/             # Shared models, components, services and global styles
│       └── features/           # Feature modules (clients, documents, projects...)
├── zz_docs/                    # Project specs, architecture & decisions log
└── zz_migrations/              # Schema (000_base.sql) & seed data (001_data.sql),
                                 #   run on first boot by Postgres' own
                                 #   docker-entrypoint-initdb.d
```

## Domain model

The core entities and how they relate:

- **Company** — owns everything below; the tenant in this multi-company SaaS
- **User** — belongs to one company, has a role (employee/admin/platform_admin)
- **Client** — belongs to a company, has addresses, quotes, invoices and job sites
- **Resource** — a catalog item, either a material or a service (labor)
- **Document** — a quote, an invoice, or a job site's own resource ledger, made of sections of priced lines
- **Project** ("chantier") — a job site, born from an accepted quote (or created by hand), planned on the calendar and invoiced once completed

Full field-level definitions are in [zz_docs/Data Definition.md](zz_docs/Data%20Definition.md).

## API overview

All routes are prefixed by their resource name and return JSON. All are protected by the JWT `authenticate` middleware, except `/auth/login`/`/auth/refresh`/`/auth/logout`, the public registration (`POST /user`, which creates the company and its first admin together), the health check (`/health`, for an external uptime monitor) and the company logos (`/uploads/...`, read by plain `<img>` tags).

| Resource                | Base path                  |
| ----------------------- | --------------------------- |
| Auth                    | `/auth` (login, refresh, logout, impersonate) |
| Login history           | `/login-history`             |
| Users                   | `/user`                      |
| Companies               | `/company`                   |
| Clients                 | `/client`                    |
| Addresses               | `/address`                   |
| Resources               | `/resource`                  |
| Resource units          | `/resource-unit`             |
| Documents               | `/document` (+ `/:id/content`, `/:id/accept`, `/:id/status`) |
| Document sections       | `/document-section`          |
| Document lines          | `/document-line`             |
| Documents (with lines)  | `/document-complete`         |
| Document templates      | `/document-template`         |
| Projects                | `/project`                   |
| Project types           | `/project-type`              |
| Project attachments     | `/project-attachment`        |
| Calendar notes          | `/calendar-note`             |
| Dashboard               | `/dashboard`                 |
| Document scanner        | `/document-scanner`          |
| Health check (public)   | `/health`                    |
| Error log               | `/error-log` (+ `/client` for browser reports) |
| PDFs                    | `/pdf/invoice/:id`, `/pdf/quote/:id`, `/pdf/reminder/:id`, `/pdf/qr-bill-slip` |

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
| `MINIO_ROOT_USER`         | MinIO (file storage) admin user      |
| `MINIO_ROOT_PASSWORD`     | MinIO admin password                 |

**`backend/.env`** — loaded by the Express app itself at runtime:

| Variable      | Description                                                   |
| ------------- | --------------------------------------------------------------- |
| `DB_HOST`     | PostgreSQL host (`postgres`, the Compose service name)          |
| `DB_PORT`     | PostgreSQL port                                                  |
| `DB_USER`     | PostgreSQL user                                                  |
| `DB_PASSWORD` | PostgreSQL password                                              |
| `DB_NAME`     | PostgreSQL database name                                         |
| `JWT_SECRET`  | Secret used to sign/verify access tokens                        |
| `JWT_REFRESH_SECRET` | Secret used to sign/verify refresh tokens (separate from `JWT_SECRET`) |
| `COOKIE_SECURE` | `true` in production (HTTPS) to mark the refresh-token cookie `Secure`; leave unset locally |
| `S3_ENDPOINT` | File storage endpoint (`http://minio:9000`, the Compose service) |
| `S3_REGION` | File storage region |
| `S3_ACCESS_KEY` | File storage access key |
| `S3_SECRET_KEY` | File storage secret key |
| `S3_BUCKET` | Bucket for logos and project attachments (created on startup) |
| `INFOMANIAK_AI_PRODUCT_ID` | Product ID for Infomaniak's AI Tools, used by the document scanner |
| `INFOMANIAK_AI_API_TOKEN`  | API token for Infomaniak's AI Tools                             |
| `DISCORD_WEBHOOK_URL` | Discord channel webhook announcing a new (or returning) error - secret, leave empty locally |
| `APP_URL` | The app's public address, for the link in those announcements (optional) |

## Documentation

The `zz_docs/` folder contains the detailed specs this project is built from:

- [Project Definition.md](zz_docs/Project%20Definition.md) — problem statement, user types, user journeys
- [Data Definition.md](zz_docs/Data%20Definition.md) — entities, fields, relations
- [Architecture.md](zz_docs/Architecture.md) — architecture decisions and folder conventions
- [Deployment.md](zz_docs/Deployment.md) — VPS/SSH/HTTPS setup, CI/CD, the redeploy command, the weekly demo reset cron
- [Decisions.md](zz_docs/Decisions.md) — trade-off log for choices that had more than one reasonable option, with what was picked and what was turned down, and why
- [Difficulties.md](zz_docs/Difficulties.md) — problems actually hit while building this, and how they were diagnosed and fixed
- [zz_docs/note/](zz_docs/note/) — personal notes taken while learning Express, npm, and setting up the dev environment

## Author

**Omar Griggio**
📧 omar.griggio@gmail.com
🔗 [github.com/OmarGriggio](https://github.com/OmarGriggio)

This project is built for learning purposes and as part of my portfolio — feedback is welcome.