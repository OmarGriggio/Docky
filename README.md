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
- quickly build quotes ("offres") and invoices,
- add materials and labor to a quote/invoice and get totals automatically,
- keep a history of past invoices.

Three types of users are planned: **employees** (day-to-day usage), **company admins** (manage their company's data and staff) and a **platform admin** (manages the SaaS itself, subscriptions and companies). Full details are in [zz_docs/Définition du projet.md](zz_docs/Définition%20du%20projet.md).

## Project status

🚧 **Work in progress.** This is a solo learning project built incrementally, not a finished product. Here's an honest snapshot of what exists today:

**Backend**
- [x] Express + TypeScript API with a layered architecture (`controller` → `service` → `repository`)
- [x] JWT-based authentication
- [x] CRUD endpoints for clients, suppliers, materials, material pricing, employee categories, invoices, invoice lines, and quotes ("offres")
- [x] PostgreSQL access via raw SQL (no ORM, by design — see [zz_docs/Architecture.md](zz_docs/Architecture.md))
- [ ] Role/permission enforcement (admin vs. employee vs. platform admin)
- [ ] Automated tests
- [ ] Database migrations (schema is currently created manually)

**Frontend**
- [x] Angular app skeleton with routing
- [x] Client and supplier list/form features wired to the API
- [ ] Invoice and quote screens
- [ ] Authentication flow / login screen
- [ ] Dashboard

**Ops**
- [ ] Docker Compose setup (planned, not implemented yet)
- [ ] Deployment

## Tech stack

| Layer            | Choice                       | Why                                                            |
| ---------------- | ---------------------------- | --------------------------------------------------------------- |
| Frontend         | Angular 21                   | Familiar framework with an architecture that fits business apps |
| Backend          | Node.js + Express + TypeScript | Lightweight, widely-used REST API stack                       |
| Database         | PostgreSQL                    | Robust, relational, fits business/invoicing data well            |
| Data access      | Raw SQL via a repository layer | Full control over queries, keeps the stack simple              |
| Authentication   | JWT                           | Standard, stateless auth for a REST API                         |
| Deployment (planned) | Docker Compose            | Reproducible environment                                       |

## Project structure

```
Docky/
├── backend/                  # Express + TypeScript REST API
│   └── src/
│       ├── controllers/      # HTTP request handling
│       ├── services/         # Business logic
│       ├── repositories/     # SQL queries / data access
│       ├── middlewares/      # e.g. JWT auth guard
│       ├── routes/
│       ├── types/
│       └── config/           # DB connection
├── frontend/                  # Angular application
│   └── src/app/
│       ├── core/
│       ├── shared/            # Shared models/services
│       ├── features/          # Feature modules (clients, suppliers, invoices...)
│       └── layout/
└── docs/                      # Project specs & architecture decisions (French)
```

## Domain model

The core entities and how they relate:

- **Entreprise** (Company) — owns everything below; the tenant in this multi-company SaaS
- **Utilisateur** (User) — belongs to one company, has a role (employee/admin)
- **Client** — belongs to a company, can have several invoices
- **Fournisseur** (Supplier) — belongs to a company, provides priced materials
- **Matériel** (Material) — a catalog item, priced by one or more suppliers
- **Tarif matériel** (Material pricing) — links a supplier, a material and a price
- **Offre** (Quote) — a quote issued to a client, made of quote lines
- **Facture** (Invoice) — an invoice issued to a client, made of invoice lines
- **Ligne de facture / d'offre** (Invoice/quote line) — a material or a labor entry
- **Catégorie d'employé** (Employee category) — defines hourly labor rates

Full field-level definitions are in [docs/Définition des données.md](docs/Définition%20des%20données.md).

## API overview

All routes are prefixed by their resource name and return JSON. Most are protected by the JWT `authenticate` middleware.

| Resource            | Base path           |
| ------------------- | -------------------- |
| Auth                | `/auth/login`         |
| Users               | `/user`               |
| Clients             | `/client`             |
| Suppliers           | `/fournisseur`        |
| Materials           | `/materiel`           |
| Invoices            | `/facture`            |
| Invoice lines       | `/facture-ligne`      |
| Invoices (with lines)| `/facture-complete`  |
| Quotes              | `/offre`              |
| Quote materials     | `/offre-materiel`     |
| Quote services       | `/offre-service`      |

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

> The database schema is bootstrapped automatically the first time the Postgres container starts, from the SQL files in [zz_migrations/](zz_migrations/) (mounted into `/docker-entrypoint-initdb.d`). To re-run them, drop the `postgres_data` volume and start the containers again.

## Documentation

The `zz_docs/` folder (in French) contains the detailed specs this project is built from:

- [Définition du projet.md](docs/Définition%20du%20projet.md) — problem statement, user types, user journeys
- [Définition des données.md](docs/Définition%20des%20données.md) — entities, fields, relations
- [Architecture.md](docs/Architecture.md) — architecture decisions and folder conventions
- [zz_docs/note/](docs/note/) — personal notes taken while learning Express, npm, and setting up the dev environment

## Author

**Omar Griggio**
📧 omar.griggio@gmail.com
🔗 [github.com/OmarGriggio](https://github.com/OmarGriggio)

This project is built for learning purposes and as part of my portfolio — feedback is welcome.
