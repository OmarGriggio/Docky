# Docky — Working conventions

Solo learning project (SaaS for small construction companies). See [README.md](README.md) for the full pitch, stack and domain model — this file is about *how to work in this repo*, for Claude and future contributors.

## Workflow

- **Git**: work directly on `main` — no feature branches. Only commit or push when explicitly asked.
- **Push**: never push without an explicit go-ahead, even after committing.
- **Commit messages**: `<Area> : <what changed>` style, e.g. `Backend : scope client lookup by id and delete to the caller's entreprise`, `Frontend : add ressource archive/unarchive actions`. Areas seen so far: `Backend`, `Frontend`. English, imperative/present tense, no period at the end. Older history used a lowercase `backend :`/`frontend :` prefix — capitalized is the current convention, use it for new commits.
- One commit per module per side (e.g. a backend change and its matching frontend change are two separate commits) — matches how every multi-file change so far has been split.
- Docs and domain vocabulary (entities, business rules) are in **French** (`Entreprise`, `Client`, `Offre`, `Facture`, `Ressource`...) — keep French for domain-facing docs/naming, English for code identifiers and technical comments, matching what's already there.

## Backend (`backend/`)

- Express 5 + TypeScript, run via `tsx watch src/server.ts` (`npm run dev`).
- **No ORM, by design** — raw SQL through `pg`, via a repository layer. Don't introduce an ORM without discussing it first (see [zz_docs/Architecture.md](zz_docs/Architecture.md)).
- Structure is **feature-module based**, not the flat `controllers/`/`services/` layout the README sketches:
  ```
  backend/src/modules/<domain>/<name>.controller.ts
                                <name>.service.ts
                                <name>.repository.ts
                                <name>.routes.ts
                                <name>.types.ts
  ```
  Each module follows `controller → service → repository`. New features should follow this same per-module layout.
- Auth: JWT (`jsonwebtoken` + `bcrypt`), guard in `shared/middlewares/auth.middleware.ts`. Rate limiting on `/auth/login` via `shared/middlewares/rate-limit.middleware.ts` (`express-rate-limit`, 20 attempts/15min/IP).
- File uploads via `multer` (see `entreprises/entreprise.upload.ts`).
- PDF/invoice generation (incl. Swiss QR-bill) lives under `backend/src/pdf/`.
- **No automated tests yet** (`npm test` intentionally exits with an error placeholder) — don't assume a test suite exists.
- **No migration tool yet** — schema is bootstrapped from raw SQL files in [zz_migrations/](zz_migrations/) mounted into Postgres' `docker-entrypoint-initdb.d`. To pick up schema changes, the `postgres_data` Docker volume needs to be dropped and containers restarted (see README's Environment variables section).
- **Multi-tenant isolation is mandatory on every query that reads/updates/deletes a single resource by id.** This is a multi-company SaaS (`id_entreprise` is the tenant boundary) — any repository function that does `WHERE id = $1` without also filtering `AND id_entreprise = $2` (scoped from `req.user.id_entreprise`, never from the request body) is a cross-tenant data leak. This exact bug existed in nearly every module (clients, fournisseurs, chantiers, documents, users, the facture PDF endpoint) until it was audited and fixed — when adding a new resource or endpoint, scope it the same way from the start. List endpoints (`getXFromDB`) already filter by `id_entreprise` — keep doing that too.
- **Archive instead of delete.** Business records (clients, fournisseurs, chantiers, documents, ressources) use an `actif BOOLEAN DEFAULT TRUE` column instead of `DELETE` — `PATCH /:id/archive` sets `actif = false`, `PATCH /:id/unarchive` restores it, and list endpoints (`GET /`) exclude archived rows unless `?includeArchived=true` is passed. A new entity that needs to be removable should follow this pattern, not add a `DELETE` route. `utilisateurs` still has a real `DELETE` (removing a user account isn't "un-deleting" a business record the same way) — the pattern is for company data, not accounts.
- **Errors**: throw a typed error from `shared/types/errors.ts` (`NotFoundError` → 404, `ConflictError` → 409, `UnauthorizedError` → 401, or `AppError` directly for another status) instead of a plain `throw new Error(...)`. A single error-handling middleware at the end of `app.ts` maps `AppError` subclasses to their status code; anything else becomes a generic 500. Express 5 forwards rejected promises from `async` route handlers to it automatically, so controllers/services never need `try/catch` for this.
- **Roles**: `role` is `'ADMIN' | 'UTILISATEUR' | 'ADMIN_PLATEFORME'` (`user.types.ts`), on the JWT payload. Enforce with `requireRole(...roles)` (`shared/middlewares/role.middleware.ts`) after `authenticate`, e.g. `router.get("/", authenticate, requireRole("ADMIN"), ...)`. `ADMIN` = that company's admin (staff management, editing company info); `UTILISATEUR` = day-to-day employee (clients/fournisseurs/chantiers/documents/ressources stay open to any authenticated company user, no role check); `ADMIN_PLATEFORME` = manages the whole SaaS, not tied to running any one company's data.
  - **`id_entreprise` on `utilisateurs` stays `NOT NULL`, deliberately** — an `ADMIN_PLATEFORME` account still has a real `id_entreprise` (whichever company it happens to be attached to is irrelevant to its platform-wide access, which is granted by `role`, not by `id_entreprise`). This was a deliberate choice over making the column nullable — see [zz_docs/Décisions.md](zz_docs/Décisions.md) for the trade-off.
  - **There is no self-service way to create an `ADMIN_PLATEFORME` account.** It's inserted by hand directly in the database. `POST /user` (registration) forces `role = 'ADMIN'` for its self-registration path — it can never produce a platform admin.
  - `entreprise.routes.ts` has two different ownership rules, both in that file (not in the generic `role.middleware.ts`, since they need to compare `req.user.id_entreprise` to `req.params.id`): reading your own company's info is open to any role of that company (`requireOwnEntrepriseOrPlatformAdmin`), editing it requires being that company's own `ADMIN` (`requireEntrepriseAdminOrPlatformAdmin`) — both also let an `ADMIN_PLATEFORME` through regardless of company.
  - `POST /user` deliberately has no `authenticate` — it's both the public "register a new company's first admin" flow (see `AuthService.register()` on the frontend: `POST /entreprise` then `POST /user`) and, when a valid token is sent, "an admin adding an employee". `createUserService` tells the two apart: unauthenticated only succeeds if `id_entreprise` has zero existing users (so it can only ever bootstrap a brand-new company) and always forces `role = 'ADMIN'`; authenticated requires `role === 'ADMIN'` on the token and forces `id_entreprise` from the token, ignoring whatever the request body sent for either field. Don't split this into two routes without good reason — the frontend's registration flow depends on this exact endpoint being reachable with no token.
- **Known, deliberately-unfixed gaps** (see the `TODO (security)` comments at each site rather than assuming these are handled): CORS is wide open (`cors()` with no options); the Postgres port is published to the host in `docker-compose.yml`. Don't "fix" these opportunistically mid-task — they need a deliberate decision (see conversation history), flag them instead.

## Frontend (`frontend/`)

- Angular 21 + PrimeNG + Tailwind CSS v4. Run via `ng serve` (`npm start`), port 4200.
- Vitest is configured (`npm test`) but coverage is minimal — check before assuming a feature has tests.
- Feature modules live under `src/app/features/`; shared models/services under `src/app/shared/`.
- API base URL comes from `src/environments/environment.ts` (dev) / `environment.prod.ts` (prod), swapped at build time via `angular.json`'s `fileReplacements`. Never hardcode `http://localhost:3000` (or any API URL) in a service — import `environment` and use `environment.apiUrl` instead, like every existing service does.
- **Every route in `app.routes.ts` is lazy-loaded** (`loadComponent: () => import(...)`), not `component: XxxComponent`. This keeps the initial bundle under the `angular.json` budget (500kB warning / 1MB error, checked on raw size) — eagerly importing components in `app.routes.ts` was the actual cause of the initial bundle blowing that budget (1.21MB → 485KB once every route went lazy). New routes should follow the same `loadComponent` pattern by default.
- **Archive/restore UI pattern**, used consistently across every list (clients, fournisseurs, chantiers, documents, ressources): a `p-checkbox [binary]="true"` "Afficher les archivés" toggle above the table (signal-backed, re-fetches with `includeArchived`), and the row action menu shows "Archiver" or "Restaurer" depending on `item.actif`, confirmed through the shared `ConfirmDialogComponent` (not the native `confirm()`). Follow this same shape for a new entity's list rather than inventing a new one.
- **Role-gated UI**: `AuthService.isAdmin` / `isUser` (computed signals off the decoded JWT) — use these to hide/disable actions the backend would now reject, e.g. `profile.ts` disables the whole form and hides the save/upload-logo actions for a non-`ADMIN` (backend enforces this too — the UI gating is just to avoid a confusing 403, not the actual security boundary). `role.guard.ts` gates entire routes (`/admin/users*`, `/uitest`) the same way; do the same for a new admin-only page.

## Environment / running locally

- Two `.env` files (root for Docker Compose vars, `backend/.env` for the Express app) — see README's "Environment variables" table before assuming a variable exists or guessing its name.
- Backend + Postgres run via `docker compose up --build`. Frontend is run separately with `ng serve` (no Docker for it yet).
- `backend/Dockerfile` is multi-stage (`dev` / `build` / `prod`). `docker-compose.yml` pins `target: dev` — that's the one actually used locally, don't remove it or compose would build the last stage (`prod`) by default. The `prod` stage (`node:22-slim`, compiled `dist/`, non-root) is what CI/CD should build for deployment; it hasn't been wired into a pipeline yet.
- **After adding a new backend dependency**, `docker compose up --build` alone can still start the container with a stale `node_modules` — the anonymous volume (`- /app/node_modules` in `docker-compose.yml`, there to stop the `./backend:/app` bind mount from shadowing the image's installed deps) persists across rebuilds and doesn't automatically pick up the new package. Run `docker compose down -v` first (this also wipes the local `postgres_data` volume — harmless for dev data, migrations rerun on next `up`).

## Docs

- [zz_docs/Définition du projet.md](zz_docs/Définition%20du%20projet.md) — problem statement, user types, user journeys.
- [zz_docs/Définition des données.md](zz_docs/Définition%20des%20données.md) — entities, fields, relations.
- [zz_docs/Architecture.md](zz_docs/Architecture.md) — architecture decisions (why no ORM, folder conventions).
- [zz_docs/Décisions.md](zz_docs/Décisions.md) — trade-off log for choices that had more than one reasonable option (archive vs delete, roles/`id_entreprise`, Dockerfile shape, rate limiting, etc.) — what was picked *and* what was turned down, with why. Check here before re-opening a decision that's already been made.
- [zz_docs/note/](zz_docs/note/) — Omar's personal learning notes (Express, npm, dev env setup) — background only, not authoritative spec.
