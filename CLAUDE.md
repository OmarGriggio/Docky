# Docky — Working conventions

Solo learning project (SaaS for small construction companies). See [README.md](README.md) for the full pitch, stack and domain model — this file is about *how to work in this repo*, for Claude and future contributors.

## Workflow

- **Git**: work directly on `main` — no feature branches. Only commit or push when explicitly asked, and never push without an explicit go-ahead even after committing.
- **Commit messages**: `<Area> : <what changed>` (e.g. `Backend : scope client lookup by id and delete to the caller's company`), capitalized, English, imperative/present tense, no trailing period. Areas so far: `Backend`, `Frontend`, `Docs`.
- One commit per module per side — a backend change and its matching frontend change are two separate commits.
- **English everywhere** — code identifiers, DB tables/columns, doc filenames and content (migrated from French, complete as of 2026-09-02; see [zz_docs/Decisions.md](zz_docs/Decisions.md) for the glossary). **Two exceptions, content not naming**: the seed data in `zz_migrations/001_data.sql` and the frontend's user-facing text (labels, buttons, messages) — both shown to a French-speaking Swiss end user, not code. Don't "fix" French UI strings into English.

## Backend (`backend/`)

- Express 5 + TypeScript, run via `tsx watch src/server.ts` (`npm run dev`). No ORM by design — raw SQL through `pg` via a repository layer (see [zz_docs/Architecture.md](zz_docs/Architecture.md) before introducing one).
- **Feature-module structure**, not the flat `controllers/`/`services/` layout the README sketches:
  ```
  backend/src/modules/<domain>/<name>.controller.ts
                                <name>.service.ts
                                <name>.repository.ts
                                <name>.routes.ts
                                <name>.types.ts
  ```
  `controller → service → repository`. Current modules: `auth`, `users`, `companies`, `clients` (+ `address.*`), `suppliers`, `projects` (+ `project_type.*`, `project_resource.*`), `catalog` (`resource.*`, `resource_supplier_price.*`), `documents` (`document.*`, `document_complete.*`, `document_line.*`, `document_section.*`, `document_template.*`).
- **`resources.type` is `MATERIAL | SERVICE`** only (simplified from `MATERIAL | LABOR | SUBCONTRACTING | OTHER`), matching `document_lines.type`.
- **`project_resources`** links a project to the resources it uses (plain many-to-many, no quantity/price). `document-form.ts` uses it to prefill a document's lines from a project ("Charger chantier" bulk-imports into Matériel/Service sections; each section also has its own one-resource-at-a-time picker). **TODO**: no frontend UI to manage the links themselves yet — created by hand against the API.
- Auth: JWT (`jsonwebtoken` + `bcrypt`), guard in `shared/middlewares/auth.middleware.ts`. Rate limiting on `/auth/login` (`express-rate-limit`, 20/15min/IP).
- **Refresh tokens**: login returns an access token (`token`, 5h, `JWT_SECRET`) and a refresh token (`refreshToken`, 7d, `JWT_REFRESH_SECRET`, hash-only stored in `refresh_tokens` so it can be revoked). `POST /auth/refresh` exchanges it (checks signature/expiry *and* the DB row); `POST /auth/logout` revokes it. Not rotated — see [zz_docs/Decisions.md](zz_docs/Decisions.md) for why. `JWT_REFRESH_SECRET` must be set in `backend/.env`.
- File uploads (`multer`, `companies/company.upload.ts`) go to local disk. **TODO: not prod-ready** — the dev bind mount that happens to persist them doesn't exist in the `prod` image; needs a volume or S3-compatible storage once a host is picked (see [zz_docs/Decisions.md](zz_docs/Decisions.md)).
- PDF/invoice generation (incl. Swiss QR-bill) under `backend/src/pdf/`.
- **Document numbers are server-generated**: `document.service.ts`'s `generateDocumentNumber` builds `{OFF|FAC}-{year}-{4-digit sequence}` (French prefixes — printed content, not a code identifier), scoped per `company_id`+`type`+year, backed by `UNIQUE (company_id, number)`. `POST /document` ignores any client-supplied `number`. Sequence found via `LIKE`+`ORDER BY`, not a counter table (see [zz_docs/Decisions.md](zz_docs/Decisions.md) for why).
- **Documents have real sections**: `document_sections` is a grouping title every `document_lines` row belongs to via a required `section_id` (replaces an earlier flat-list-with-marker-line approach — reopened, see [zz_docs/Decisions.md](zz_docs/Decisions.md)). `document_lines.type` is `MATERIAL`/`SERVICE` only, both always priced (`quantity`/`unit_price` `NOT NULL`), both using `quantity`+`unit` for their amount (e.g. `"5 Heure"` for a service — no separate time field). `position` is scoped to the line's section; `document_sections.position` orders sections. `addLineServ` checks the given `section_id` belongs to the target document. **TODO**: the invoice PDF still renders lines as one flat list, ignoring sections.
- **VAT**: `documents.vat_rate` (one rate per document — Switzerland has a single standard rate) applied on `amount_excl_vat` by `computeDocumentTotals`. **Payment terms**: `payment_terms` (free text) + `due_date` (structured), set directly, no computation.
- **`document_templates`**: default introduction/conclusion per `(company_id, type)`, at most one row each. `GET /document-template?type=X` (`null` if unset), `PUT /document-template/:type` (upsert). Purely client-side convenience — `document-form.ts` fills a new document's fields from it on type pick, nothing server-side reads this table. Edited from the Profile page.
- **No migration tool** — schema bootstraps from [zz_migrations/](zz_migrations/) via Postgres' `docker-entrypoint-initdb.d`. A schema change needs `docker compose down -v` + restart to apply.
- **Seed data** ([zz_migrations/001_data.sql](zz_migrations/001_data.sql)) runs right after `000_base.sql` on every fresh volume — a full sample dataset so there's always something to look at. **Dev logins, all `password123`**: `admin@dedonnostyle.ch` (`ADMIN`), `user@dedonnostyle.ch` (`USER`), `platform-admin@docky.ch` (`PLATFORM_ADMIN`). Update this file in the same pass as any schema change it touches — it drifts silently otherwise. `documents.amount_excl_vat`/`amount_incl_vat` here are hand-computed (raw SQL bypasses `recomputeDocumentTotalsServ`) — keep in sync by hand if you touch seeded lines.
- **Multi-tenant isolation is mandatory on every query touching a single resource by id.** `company_id` is the tenant boundary — any repository function doing `WHERE id = $1` without `AND company_id = $2` (from `req.user.company_id`, never the body) is a cross-tenant leak. This bug existed in nearly every module until audited and fixed — scope new endpoints the same way from the start. List endpoints already filter by `company_id`. Exception: `project_types` is a global lookup table, no `company_id`.
- **Archive instead of delete**: business records (clients, suppliers, projects, documents, resources) use `is_active` — `PATCH /:id/archive`/`/:id/unarchive`, `GET /` excludes archived unless `?includeArchived=true`. Follow this for new removable entities. `users` keeps a real `DELETE` (account, not business record); so does `project_types` (shared lookup — deleting one nulls `project_type_id` on referencing projects).
- **Errors**: throw from `shared/types/errors.ts` (`NotFoundError`→404, `ConflictError`→409, `UnauthorizedError`→401, or `AppError` directly) instead of plain `Error`. One error middleware at the end of `app.ts` maps them; Express 5 forwards rejected async promises to it automatically, no `try/catch` needed.
- **Roles**: `'ADMIN' | 'USER' | 'PLATFORM_ADMIN'` on the JWT payload, enforced with `requireRole(...roles)` after `authenticate`. `ADMIN` = that company's admin; `USER` = employee (business modules stay open to any authenticated company user, no role check); `PLATFORM_ADMIN` = whole-SaaS, not tied to one company's data.
  - `company_id` on `users` stays `NOT NULL` even for `PLATFORM_ADMIN` — deliberate, see [zz_docs/Decisions.md](zz_docs/Decisions.md).
  - **Cross-company access ("impersonation") — decided direction, not built**: a `PLATFORM_ADMIN` picks a company from `GET /company`, gets a new access token with that `company_id` swapped in but `role` staying `PLATFORM_ADMIN` (so they can switch companies without re-authenticating). **Refresh-token behavior during impersonation is still an open question** — see [zz_docs/Decisions.md](zz_docs/Decisions.md) before building this.
  - **No self-service way to create a `PLATFORM_ADMIN`** — inserted by hand in the DB. `POST /user`'s public registration path always forces `role = 'ADMIN'`.
  - `company.routes.ts` has its own ownership checks (comparing `req.user.company_id` to `req.params.id`, so not in the generic role middleware): reading is open to any role of that company, editing needs that company's own `ADMIN` — both also let `PLATFORM_ADMIN` through regardless of company.
  - `POST /user` has no `authenticate` deliberately — it's both public "register a new company" (unauthenticated, only succeeds if `company_id` has zero users, always forces `ADMIN`) and "admin adding an employee" (authenticated, requires `role === 'ADMIN'`, forces `company_id` from the token). Don't split into two routes — the frontend's registration flow depends on this one endpoint being reachable with no token.
- **Known, deliberately-unfixed gaps** (see `TODO (security)` comments): CORS wide open, Postgres port published to the host. Don't fix opportunistically — flag instead, they need a deliberate decision.

## Frontend (`frontend/`)

- Angular 21 + PrimeNG + Tailwind CSS v4. `ng serve` (`npm start`), port 4200.
- Feature modules under `src/app/features/`, shared models/services under `src/app/shared/`. Current: `auth`, `admin`, `clients`, `addresses`, `suppliers`, `projects`, `resources`, `documents`, `profile`, `uitest`.
- API base URL from `environment.ts`/`environment.prod.ts` (swapped at build time via `angular.json`'s `fileReplacements`) — always `environment.apiUrl`, never a hardcoded URL. Dev builds proxy `/api/*` to `localhost:3000` via `ng serve`'s own `proxy.conf.json` (`angular.json`'s `serve.options.proxyConfig`) — same relative-URL pattern prod uses with nginx, so the browser only ever talks to one origin (this is what makes testing through a devtunnel or a LAN IP work at all).
- **Every route in `app.routes.ts` is lazy** (`loadComponent`, not `component:`) — keeps the initial bundle under `angular.json`'s budget (500kB/1MB raw). Follow this for new routes.
- **Archive/restore UI pattern** (every list): a signal-backed "Afficher les archivés" `p-checkbox` above the table, row actions show "Archiver"/"Restaurer" per `item.is_active`, confirmed via the shared `ConfirmDialogComponent`. Follow the same shape for a new entity.
- **Role-gated UI**: `AuthService.isAdmin`/`isUser` (computed off the decoded JWT) hide/disable actions the backend would reject anyway (UI gating avoids a confusing error, isn't the real security boundary — that's the backend). `role.guard.ts` gates whole routes the same way.
- **Auth token refresh**: both tokens in `localStorage` (`docky_token`, `docky_refresh_token`). `auth.interceptor.ts` catches a 401 (except on `/auth/login`/`/auth/refresh`), refreshes, retries once; dedupes concurrent 401s into one `/auth/refresh` call. `logout()` also revokes server-side (best-effort).
- **UI text stays French** — only code identifiers are English. Not leftover debt, a deliberate convention (see [zz_docs/Decisions.md](zz_docs/Decisions.md)).

## Testing

- **Vitest on both sides** (`npm test`). Started 2026-09-02, deliberately tiny (unit tests on pure functions only — no DB, no HTTP, nothing async) — don't scale up (real test DB, Supertest, E2E) without discussing first, see [zz_docs/Decisions.md](zz_docs/Decisions.md).
- Existing coverage: `document.calculations.ts` (backend), `display.ts` (frontend) — each with a colocated `*.test.ts`. Don't assume anything else has coverage. Frontend's default `app.spec.ts` smoke test fails on a missing `ActivatedRoute` provider — pre-existing, unrelated, not yet fixed.
- **Pattern to repeat**: pull the pure calculation out of anything mixing logic with I/O into its own small function/file, test that; the I/O orchestration stays where it was. Don't extract something that secretly still touches I/O.
- Test files: `<name>.test.ts` colocated next to `<name>.ts`.

## Environment / running locally

- Two `.env` files (root for Docker Compose, `backend/.env` for Express) — see README's "Environment variables" table before guessing a variable name.
- Backend + Postgres: `docker compose up --build`. Frontend: `ng serve` separately (no Docker for it yet).
- `backend/Dockerfile` is multi-stage (`dev`/`build`/`prod`); `docker-compose.yml` pins `target: dev` — don't remove it. `prod` (`node:22-slim`, compiled `dist/`, non-root) is for deployment, not yet wired into a pipeline.
- **After adding a backend dependency**, `docker compose up --build` alone can leave a stale `node_modules` (the anonymous volume that stops the bind mount from shadowing installed deps persists across rebuilds). Run `docker compose down -v` first (also wipes `postgres_data` — harmless, migrations rerun).

## Deployment

- **Server**: Infomaniak VPS Lite (Ubuntu 22.04), `179.237.86.113`, no domain yet. SSH as `ubuntu` (key-based, passwordless `sudo`) — see [zz_docs/Decisions.md](zz_docs/Decisions.md) for why Infomaniak/a VM over a PaaS, and Nginx over Caddy.
- **Two firewalls needed**: OS `ufw` (22/80/443 only) *and* Infomaniak's own Cloud panel firewall (80/443 had to be opened there too).
- Repo cloned at `~/docky`, updated via `git pull`, auth via a read-only deploy key (`~/.ssh/docky_deploy_key`), not a personal key.
- **`docker-compose.prod.yml`** (not the dev one) runs prod: only `nginx` is published (port 80), routing `/api/*` to `backend:3000` (prefix stripped in `nginx/nginx.conf`) and everything else to the built Angular app (own SPA fallback in `frontend/nginx.conf`) — hence `environment.prod.ts`'s relative `apiUrl: '/api'`. Uploads go to a named volume (`backend_uploads`), not the dev bind mount. **If only an nginx config changed** (no code), `up --build -d` won't make the running container reread it — `docker compose -f docker-compose.prod.yml restart nginx` after.
- Real prod secrets live in `.env`/`backend/.env` *on the server only*, never committed.
- **Redeploy**: SSH in, `cd ~/docky && git pull && docker compose -f docker-compose.prod.yml up --build -d`. Manual — no CI/CD yet.
- **Known gaps**: no domain/HTTPS (`nginx.conf` has no `server_name`/TLS — needs a certbot pass once a domain exists); no CI/CD.

## Docs

- [zz_docs/Project Definition.md](zz_docs/Project%20Definition.md) — problem statement, user types, user journeys.
- [zz_docs/Data Definition.md](zz_docs/Data%20Definition.md) — entities, fields, relations.
- [zz_docs/Architecture.md](zz_docs/Architecture.md) — architecture decisions (why no ORM, folder conventions).
- [zz_docs/Decisions.md](zz_docs/Decisions.md) — trade-off log for choices with more than one reasonable option — what was picked *and* what was turned down, with why. Check here before re-opening a decision that's already been made.
- [zz_docs/note/](zz_docs/note/) — Omar's personal learning notes — background only, not authoritative spec.
