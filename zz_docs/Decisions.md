# Decisions log

This file tracks technical choices that had more than one reasonable option, along with the why — not just "what was done" (already in `CLAUDE.md` and the git history), but **what was turned down and why**. Useful so a decision doesn't get reopened without reading this page first, and to remember the reasoning later.

## Invoicing schema gaps: numbering uniqueness, VAT/payment terms, flexible document lines

**Context**: comparing Docky against Odoo's invoicing app (see the invoice form's header/client/lines/footer breakdown) surfaced four gaps, worked through one at a time — schema first, then the matching backend logic (service/repository/types) in the same session once the schema was verified.

**1. Document numbering** — `documents.number` was `UNIQUE` globally, which would have blocked two different companies from both using `INVOICE-2026-0001`. Changed to `UNIQUE (company_id, number)` — a table-level constraint, scoped per tenant like everything else in this multi-company schema. Generation itself lives in `document.service.ts`'s `generateDocumentNumber`: `{OFF|FAC}-{year}-{4-digit sequence}`, French prefixes (`OFF` for `QUOTE`, `FAC` for `INVOICE`) chosen to match the format already used in the seed data and the same "printed content stays French" reasoning as the PDF — not `INV_YYYY_00001` as first floated. The sequence resets every year (the year is baked into the number) and is found via a `LIKE 'FAC-2026-%' ORDER BY number DESC LIMIT 1` query rather than a dedicated counter table — works because the suffix is fixed-width and zero-padded, so lexicographic and numeric ordering agree; simpler than a counter table for a solo project's write volume, revisit only if concurrent creates ever cause a real collision (the `UNIQUE` constraint would surface one as a 500 today rather than silently corrupting data).

**2. Client address on a document** — considered snapshotting the client's address onto the document (or a `billing_address_id` FK) so a document's printed address can't change retroactively if the client's address is edited later. **Turned down for now**: Omar chose to keep using the client's primary address dynamically (same as today), accepting that a historical document's displayed address could in theory change if that address is edited afterwards. Simpler, no schema change, revisit if this ever causes a real problem.

**3. Flexible document lines (sections/notes)** — the real gap behind "I want to play with the presentation, add a section, add a line". Two shapes considered:
- **Flat list, extended `type`** (chosen): keep `document_lines` as a single flat list ordered by `position`; add `SECTION` (a grouping title, no price) and `NOTE` (free text, no price) as two more values alongside `MATERIAL`/`SERVICE`. No `section_id`, no hierarchy — a `SECTION` line just visually groups everything after it (in `position` order) up to the next one. This is genuinely how Odoo's own invoice lines work (`display_type`: `line_section` / `line_note` / a real product line, all in one flat, ordered table) — same shape, not a coincidence, found while comparing the two.
- **Turned down — a real hierarchy** (`document_sections` table + `document_lines.section_id`): gives referential integrity and a free `GROUP BY` for section subtotals, but adds a second table, a join on every read, and two position spaces to keep in sync (section order + line-within-section order) — real complexity for a subtotal-per-section feature nobody's asked for yet.
- **Schema change made**: `document_lines.quantity` and `unit_price` are now nullable (a `SECTION`/`NOTE` line has neither). `type` itself needed no migration — it was already a plain `VARCHAR(20)` with no `CHECK` constraint, just an application-level union (`document_line.types.ts`) extended to `'MATERIAL' | 'SERVICE' | 'SECTION' | 'NOTE'`. `document_line.service.ts`'s `addLineServ` forces `quantity`/`unit_price` to `null` for `SECTION`/`NOTE` server-side regardless of what's sent (same spirit as amounts being forced to 0 on document creation), and `computeDocumentTotals` skips any line with a `null` quantity/unit_price when summing. **Not done yet**: the PDF (`invoice.dto.ts`) currently filters `SECTION`/`NOTE` lines out entirely rather than rendering them — actual section headers/notes in the PDF layout, and a frontend line-type picker, are still open.

**4. VAT and payment terms** — both simply didn't exist. Added `vat_rate NUMERIC(5,2) DEFAULT 0` on `documents` (one rate per document, not per line — Switzerland has a single standard rate, and per-line rates would be real complexity for a need that doesn't exist yet, same reasoning as the sections/hierarchy choice above), applied on top of `amount_excl_vat` by `computeDocumentTotals` to get `amount_incl_vat` (no longer just a copy of `amount_excl_vat`). Plus `payment_terms TEXT` (free text, e.g. "Payable à 30 jours net") and `due_date DATE` (structured, so overdue invoices can be queried/sorted later) — kept as two separate, complementary columns rather than parsing one out of the other, both just set directly with no computation involved.

**Verified**: schema applied cleanly against a freshly recreated Postgres (`docker compose down -v && up --build`); `npx tsc --noEmit` and `npm test` green throughout (2 new `document.calculations.test.ts` cases added: VAT applied on top of the discounted subtotal, and `SECTION`/`NOTE` lines skipped when summing); live end-to-end against the API — created a `QUOTE` with no `number` in the request (got back `OFF-2026-0003`, correctly continuing after the two seeded `OFF-2026-000*`), added a `SECTION` line with a deliberately-bogus `quantity`/`unit_price` (came back `null`, confirming the server-side override), a priced `MATERIAL` line (10 × 50.-) and a `NOTE` line, and the document's `amount_excl_vat`/`amount_incl_vat` came back as `500`/`540.5` at an 8.1% `vat_rate` — matching the math by hand. Invoice PDF generation (`GET /pdf/invoice/:id`) still produces a valid PDF with the DTO's new line filter in place.

## Refresh tokens: localStorage + DB-tracked, no rotation, reactive interceptor

**Context**: the access token expired after 5h with no way to renew it — `generateRefreshToken()` existed in `jwt.service.ts` since early on but nothing ever called it (`auth.service.ts` had a standing `//TODO`). Three independent axes had to be picked, each with its own trade-off:

**1. Where the refresh token lives on the frontend** — `localStorage` (chosen) vs. an `httpOnly` cookie vs. in-memory only.
- **For `localStorage`**: trivial, consistent with how the access token already works, no change to the currently wide-open CORS setup.
- **Against**: vulnerable to XSS (a malicious script running in the page can read it) — worse than an access token leak since it's valid 7 days instead of 5h.
- **Turned down**: an `httpOnly` cookie is the safer standard answer (immune to XSS), but it requires `cors({ origin, credentials: true })` instead of the current unrestricted `cors()`, plus `withCredentials: true` on the frontend and CSRF protection — real work, and it touches the CORS gap that's deliberately left alone for now (see the "Known, deliberately-unfixed gaps" bullet in `CLAUDE.md`). In-memory-only is the safest against persistent XSS but logs the user out on every page refresh on its own — not viable without also adding a cookie for silent refresh on load, which is more moving parts than this project needs right now.

**2. Whether the backend can revoke a refresh token before it expires** — DB-tracked, no rotation (chosen) vs. fully stateless vs. DB-tracked with rotation.
- **For DB-tracked**: a `refresh_tokens` table (`user_id`, `token_hash`, `expires_at`, `revoked_at`) means logout actually invalidates the token server-side, not just client-side — `POST /auth/refresh` checks both the JWT signature/expiry *and* that the DB row isn't revoked. Only the hash is stored (`crypto.createHash("sha256")`), same reasoning as `password_hash` — a DB leak alone shouldn't hand out valid tokens.
- **Turned down — fully stateless**: zero new table, the code already existed — but a stolen or "logged out" refresh token stays valid for the rest of its 7 days no matter what, with no way to revoke it. Rejected as too weak a guarantee for something that grants a week of access.
- **Turned down — rotation** (issue a new refresh token on every use, invalidate the old one, detect reuse of an old one as a compromise signal): the most secure option, but real added complexity (tracking a "family" of tokens, handling reuse detection) for a solo project with no real client data yet. Noted here as the natural next step if this ever needs hardening — same "revisit later, same method" pattern as the tests/integration-test decision below.

**3. How the frontend triggers a refresh** — reactive, inside `auth.interceptor.ts` (chosen) vs. a proactive timer.
- **For reactive**: `auth.interceptor.ts` already catches 401s (previously just to log out); extending it to try one `refreshAccessToken()` and retry the original request before giving up keeps the logic in one place, transparent to every component. Concurrent 401s (e.g. a page firing several list requests at once) are deduped through a single cached in-flight `Observable`, reset once it settles, so they don't each trigger their own `/auth/refresh` call.
- **Turned down — proactive timer**: refreshes before expiry so a request never has to fail first, but that's an extra moving part (a timer to schedule/cancel) for a marginal UX gain the reactive approach already covers well enough.

## Archive instead of delete (`is_active`)

**Choice**: `is_active BOOLEAN DEFAULT TRUE` on clients/suppliers/projects/documents/resources, `PATCH /:id/archive` and `/:id/unarchive` replace `DELETE`.

- **For**: invoicing software should never truly lose business data (accounting traceability); reuses a pattern that already half-existed (`users`, `resources` already had the column, never wired up); reversible (an accidental archive is fixed in one click).
- **Against / limits**: one more thing to filter everywhere (`WHERE is_active = true` by default) — easy to forget on a future query; doesn't address GDPR/right-to-be-forgotten if a client ever asks for a real deletion (not handled, not urgent since there's no real client data yet).
- **Turned down**: keeping `DELETE` in addition to archiving (both). Rejected to stay simple — one action per row, not two to maintain on both sides (API + UI).

## Identifier for archive/unarchive routes: `:id` everywhere

**Choice**: `PATCH /client/:id/archive` (numeric id in the URL), whereas the old `DELETE /client` took `client_number` in the body.

- **For**: consistent with `project`/`document` which already used `:id`; more RESTful (the URL identifies the resource); a single kind of identifier to document/learn.
- **Against**: a small API contract change — the frontend had to be updated at the same time (not just an addition, a change).

## Rate limiting: 20 attempts / 15 min, in-memory

**Choice**: `express-rate-limit`, `limit: 20`, `windowMs: 15 * 60 * 1000`, counter kept in the process' memory (not Redis).

- **For**: zero extra infrastructure, one dependency, five lines of config; plenty for a single backend process (no horizontal scaling planned); 20 rather than the usual default (often 5-10) because a user who mistypes their password twice shouldn't get locked out.
- **Against / limits**: if several backend instances ever run behind a load balancer, each instance keeps its own counter — the real global limit becomes `20 × number of instances`. Not a problem as long as there's a single backend container.

**Related decision — `app.set("trust proxy", 1)`**: added even though Omar isn't setting up a load balancer or Cloudflare himself, because nearly every host (Render, Railway, Fly.io...) already routes traffic through its own proxy even on a "no infra" plan — without this setting, `req.ip` would always be the host's proxy IP, and rate limiting would silently become useless (everyone shares one counter) once deployed. Cost: one line, zero added complexity on Omar's side.

## Dockerfile: a single multi-stage file (`dev`/`build`/`prod`)

**Choice**: one `Dockerfile` with several stages (`FROM ... AS dev`, `AS build`, `AS prod`), selected via `target:` in `docker-compose.yml`.

- **For**: a single source of truth for the shared steps (dependencies, `WORKDIR`); the existing dev flow (`docker compose up --build`) didn't change, just got pinned to `target: dev`; the prod image (`node:22-slim`, compiled code, no devDependencies, non-root user) stays separate and lighter (269 MB vs 315 MB measured).
- **Against**: a single file that's a bit longer to read, the multi-stage syntax is a bit less obvious to someone new to Docker than two separate files (`Dockerfile.dev` / `Dockerfile`).
- **Turned down**: two separate files. Simpler to read in isolation, but duplicates the shared steps (installing deps, `WORKDIR`) and it's easier to forget to carry a change over to both.

## API URLs: `environment.ts` (native Angular) rather than a runtime config

**Choice**: `src/environments/environment.ts`/`environment.prod.ts`, swapped at build time via `fileReplacements` in `angular.json`.

- **For**: standard Angular mechanism, zero dependency, the swap is checked at build time (no silent miss); neither file holds a secret (just a public URL), so both can be committed without concern, unlike a `.env`.
- **Against / limits**: the prod URL is frozen **at build time**, not changeable afterwards without rebuilding — if the API URL changes, the frontend's prod build has to be run again. Not an issue for now (a single prod environment is planned), but worth keeping in mind if the same image ever needs to serve several environments (staging/prod) without rebuilding each time — alternative in that case: a config file loaded at runtime (a `config.json` served next to the bundle), more complex, not needed now.

## Initial bundle too big: lazy-loading routes, not raising the budget

**Choice**: every route in `app.routes.ts` uses `loadComponent`, `angular.json`'s budget left unchanged (500 kB warning / 1 MB error).

- **For**: fixes the actual cause (the whole app's code was loaded at once, including `/admin`, `/uitest`, no matter which page was visited first) rather than hiding the symptom; measured result: 1.21 MB → 485 KB initial, the rest in on-demand chunks.
- **Against**: none really, aside from a tiny extra latency (one more network round trip) the first time a given route is visited — far outweighed by the faster initial load.
- **Turned down**: just raising the budget in `angular.json`. Would have made the warning disappear without fixing anything — the budget was flagging a real problem (no code splitting at all), not a badly-calibrated threshold.

## Error handling: an `AppError` hierarchy + a single middleware

**Choice**: `NotFoundError`/`ConflictError`/`UnauthorizedError`/`ForbiddenError` (all `extends AppError` with a `statusCode`), a single error middleware at the end of `app.ts`, no `try/catch` in controllers (Express 5 forwards rejected promises automatically).

- **For**: each service picks the right HTTP code in one line (`throw new NotFoundError(...)`) without ever touching `res`; a single place to change the error response format; leans on Express 5 instead of reinventing an `asyncHandler` wrapper.
- **Against**: depends on Express 5 (Express 4 wouldn't forward async errors automatically — would have needed a wrapper or `try/catch` everywhere). Not an issue here, the project is already on Express 5.

## Roles: `company_id` stays `NOT NULL`, platform admin created by hand

**Choice made by Omar**: no nullable column, no separate table. `company_id` stays required for everyone, including a `PLATFORM_ADMIN` (who is simply assigned a real company, unrelated to their permissions which come solely from `role`). No API lets anyone create a `PLATFORM_ADMIN` account — it's inserted by hand directly in the database.

- **For**: zero type change anywhere else in the code (`company_id: number` stays true everywhere, no controller/service needs to handle a `null` case); the `NOT NULL` constraint itself technically prevents a platform admin from being created any other way than by hand (even in case of an application bug, the database would refuse a missing `company_id`); sufficient as long as there's no real need for "platform staff" in the plural.
- **Against / limits**: if a real platform-admin management page is ever needed (several accounts, self-service onboarding), they'd either have to be arbitrarily assigned an existing company (conceptually odd — why would a platform admin "belong" to a client company?), or this decision would need revisiting. Accepted as fine for now, to revisit if that need shows up.
- **Current scope, not to be assumed broader than it is**: as implemented, a `PLATFORM_ADMIN` has platform powers (list/edit any company) **and** acts as a normal `ADMIN` on *their own* company (the one their `company_id` points to) — but doesn't see other companies' clients/projects/invoices. Omar eventually wants a platform admin to see/manage everything across any company (not just their own) — not implemented, deliberately deferred (2026-09-01) until there are real platform-admin features to build. For that version (full access, across all companies), two approaches were discussed, neither settled:
  - make `company_id` genuinely nullable (revisit this choice), and add an explicit way for business endpoints (clients/projects/documents/resources) to target a specific company (e.g. `?company=X`) when the caller is `PLATFORM_ADMIN` — not just unlocking access, a real cross-company navigation feature to design;
  - or a notion of "impersonation" (the platform admin picks a company to act as temporarily).
- **Options turned down** (for the "NOT NULL" choice above):
  - *nullable `company_id`* — more "correct" conceptually (a platform admin belongs to no company), but would have required threading `number | null` through the typing everywhere `req.user.company_id` is used (7 controllers), with a guard helper (`getCompanyId(req)`) to add everywhere. Turned down at Omar's request: more code surface to maintain for a need that doesn't exist yet.
  - *separate table (`platform_admins`)* — the architecturally "cleanest" option (genuinely separates two different notions: product staff vs. client staff), but doubles the auth logic (two tables to query at login, or a different login flow). Worth it if the project becomes a real commercial product with a support team; premature for a solo project not yet on the market.

## `POST /user`: a single route for two uses (public registration + adding an employee)

**Choice**: keep a single `POST /user` endpoint, with no `authenticate` at the route level — the distinction between "public registration of a new company" and "an admin adding an employee" is made *inside* `createUserService`, based on whether a valid token is present.

- **For**: the frontend (`AuthService.register()`) already depends on this `POST /company` → `POST /user` sequence while logged out (impossible to be logged in before your own account exists); no new endpoint to document/maintain.
- **Against**: the route's logic is a little less readable at a glance in `user.routes.ts` (you have to read the service to understand both paths) — offset by an explicit comment there.
- **Hardened along the way**: previously, anyone could add themselves as `ADMIN` on an already-existing company by guessing its `company_id` (no check). Now, the unauthenticated path only works if the company has *no* users yet (`getUsersFromDB(company_id).length === 0`) — so it can only ever bootstrap a brand-new company.

## Logo storage: local disk for now, decision deferred to the choice of host

**Context**: `company.upload.ts` writes logos to the backend container's local disk (`backend/uploads/companies/<id>/logo.<ext>`). While digging into this (2026-09-02), two bugs were found around it, fixed independently of the decision below:
- a test logo had ended up committed to git (`uploads/` wasn't in `.gitignore`);
- a Docker volume line meant to persist uploads (`./uploads:/app/uploads`) was mounted on the `postgres` service instead of `backend` — actually pointless either way: the `./backend:/app` bind mount (already there for hot-reload) already persists `/app/uploads` to `backend/uploads/` on the host. This line was removed rather than moved.

**The real problem**: this bind mount only exists in dev (`docker-compose.yml`). The `prod` image (used for a real deployment) has no persistence mechanism for `/app/uploads` at all — an uploaded logo vanishes on the container's next restart/redeploy, silently.

**Not settled yet, depends on the host chosen**:
- *Local disk + a persistent volume* — simple, no new dependency, but only works if the host offers a volume attached to the app container (often a paid option / unavailable on the simplest plans).
- *S3-compatible object storage* (Cloudflare R2 suggested: S3 API, no egress fees, generous free tier) — works regardless of the host, survives any redeploy, but adds an external account + an API key to manage. Limited code change (`multer.memoryStorage()` + sending the buffer to the bucket instead of disk).

To be settled once the prod host is chosen, not before.

## Tests: start with unit tests on pure logic only

**Context**: the first tests ever written on this project (2026-09-02), and the first tests Omar has written on any personal project at all — explicit goal to actually understand the concepts, not just have a green CI.

**What was considered and then set aside**: a real integration-test setup — a second, dedicated Postgres service for tests in `docker-compose.test.yml` (separate database, separate port, schema without the demo data), a `backend/.env.test` file, a Vitest setup hook to load that config and empty the tables between tests, and tests going through Supertest against the whole Express app (routes → middlewares → controller → service → repository → real database). All of this was thought through fully — it isn't wrong, it stays the right target **if** this project ever gets a real CI or several contributors — but presented all at once, it had the opposite of the intended effect: instead of building understanding, it gave the impression of complicating the project without mastering it.

**Choice made**: unit tests on pure functions only (no database, no network, nothing async) — see the "Testing" section of `CLAUDE.md` for the exact pattern (pull the pure calculation/decision out into its own file, the service/component keeps just the I/O orchestration). Zero new piece of infrastructure: no extra Docker, no test environment file, no new dependency besides Vitest itself.

- **For**: each step is small, immediately understandable, and verifiable by Omar himself (a calculation was even deliberately broken to prove a test would catch it, then fixed) — builds confidence and understanding before adding machinery.
- **Against / limits**: covers only a tiny fraction of the code — most of the real bugs found that day (the two broken SQL `INSERT`s, the endpoints missing `authenticate`) are exactly the kind of thing a unit test on pure logic *can't* catch, only an integration test against a real database would have. So this isn't real test coverage in the classic sense yet.
- **To revisit later, same method (small steps)**: the integration setup described above stays the logical next step once Omar feels ready — no need to rebuild it from scratch, the thinking is already done here.

## Full vocabulary migration, French → English (2026-09-02)

**Context**: the project started with business vocabulary in French (tables, columns, backend and frontend folders/files, docs) and technical code in English — a mix the project no longer wanted (it was the original intent at the start, see the original convention in `CLAUDE.md`'s history). Decision: **move everything to English**, including the business docs' content — English becomes the project's main language, with no exception for business vocabulary.

**What doesn't change**: the sample data content (`zz_migrations/001_data.sql`) — people's names, Swiss addresses, business text — stays in French. That's not naming, it's a realistic dataset for a Swiss company; translating it would make no sense. **Decision extended in phase 3**: the text shown to the user in the frontend (form labels, buttons, page titles, error/success messages) also stays in French, for the same reason — it's the product as seen by an end user (a French-speaking Swiss company), not code naming. Only code identifiers (variable names, `formControlName`, CSS classes, component/service/file names, routes, query params, enum values) move to English.

**Glossary used** (reference for the migration):

| French | English |
|---|---|
| `entreprise(s)` | `company` / `companies` |
| `utilisateur(s)` | `user(s)` |
| `client(s)` | `client(s)` *(already identical)* |
| `adresse(s)` | `address(es)` |
| `chantier(s)` / `type_chantier` | `project(s)` / `project_type(s)` *(chosen by Omar — shorter than "construction site", accepting the ambiguity with "the Docky project" itself knowingly)* |
| `fournisseur(s)` | `supplier(s)` |
| `ressource(s)` / `ressources_tarifs_fournisseurs` | `resource(s)` / `resource_supplier_prices` |
| `document(s)` / `document_ligne(s)` | `document(s)` / `document_line(s)` *(already identical for "document")* |
| `id_entreprise` (almost every table) | `company_id` |
| `actif` (almost every table) | `is_active` |
| `nom` / `prenom` | `last_name` / `first_name` |
| `societe` | `company_name` (client) / `name` (supplier) |
| `telephone` | `phone` |
| `rue` / `npa` / `ville` / `pays` | `street` / `postal_code` / `city` / `country` |
| `remarque` | `note` |
| `statut` | `status` |
| `montant_ht` / `montant_ttc` | `amount_excl_vat` / `amount_incl_vat` |
| `rabais` | `discount` |
| `numero` | `number` |
| `principale` | `is_primary` |
| `libelle` | `label` |
| `quantite` / `prix_unitaire` | `quantity` / `unit_price` |
| `date_creation` / `date_modif` / `date_creat` | `created_at` / `updated_at` |
| `motdepasse_hash` | `password_hash` |
| `date_derniere_connexion` | `last_login_at` |
| Roles: `UTILISATEUR` / `ADMIN_PLATEFORME` | `USER` / `PLATFORM_ADMIN` (`ADMIN` unchanged) |
| Client type: `PARTICULIER` / `PROFESSIONNEL` | `INDIVIDUAL` / `PROFESSIONAL` |
| Resource type: `MATERIEL` / `MAIN-OEUVRE` / `SOUS-TRAITANCE` / `DIVERS` | `MATERIAL` / `LABOR` / `SUBCONTRACTING` / `OTHER` |
| Document type: `OFFRE` / `FACTURE` | `QUOTE` / `INVOICE` |
| Document status: `BROUILLON` / `ENVOYE` / `ACCEPTE` / `REFUSE` / `PAYE` / `ANNULE` | `DRAFT` / `SENT` / `ACCEPTED` / `REJECTED` / `PAID` / `CANCELLED` |

**Execution plan, 4 phases, one at a time with verification in between** (as with any sizeable feature on this project):
1. ✅ **Schema** (`zz_migrations/000_base.sql` + `001_data.sql`) — done and verified against a real, fresh Postgres database (correct row counts, English enum values, consistent amounts).
2. ✅ **Backend** — done and verified. Every module renamed (folders, files, types, fields): `companies`, `users`, `clients`+`address.*`, `suppliers`, `projects`+`project_type.*` (replaces `chantiers`), `catalog` (`resource.*`, `resource_supplier_price.*`, replaces `catalogue`), `documents` (`document.*`, `document_complete.*`, `document_line.*`), and `pdf/` (`invoice.*` replaces `facture.*`, Swiss QR-bill DTOs and validators updated). `project_types` turned out to be a global lookup table (no `company_id`, no `is_active`) — not in the initial glossary, fixed by writing the module from the real schema rather than by analogy. `app.ts`'s URL paths also moved to English (`/entreprise`→`/company`, `/fournisseur`→`/supplier`, `/chantier`→`/project`, `/type-chantier`→`/project-type`, `/adresse`→`/address`, `/ressource`→`/resource`, `/ressource-tarif-fournisseur`→`/resource-supplier-price`, `/document-ligne`→`/document-line`, and `/pdf/facture/:id`→`/pdf/invoice/:id`) — not explicitly asked for at first, but needed for consistency, and phase 3 (frontend) had to rewrite every API call anyway. The Swiss QR-bill validation error messages (creditor/debtor) also moved to English; the labels printed on the payment slip itself (`Récépissé`, `Payable à`, etc., picked among the languages the SIX standard allows) and the invoice templates' business text stay in French, same logic as the sample data — it's printed content for a French-speaking Swiss client, not a naming convention. Verified: clean `npx tsc --noEmit`, `npm test` green (5/5), and end-to-end against a freshly recreated Postgres (`docker compose down -v && up --build`) — login, every migrated endpoint, and invoice PDF generation (with QR-bill) all tested successfully.
3. ✅ **Frontend** — done and verified. Every `features/` module renamed and aligned with the API's new field names: `adresses`→`addresses` (+ `adresse-form`→`address-form`), `fournisseurs`→`suppliers`, `chantiers`→`projects`, `ressources`→`resources`, `documents` (`document-ligne*`→`document-line*`), `admin`/`auth`/`profile` (`entreprise.service.ts`→`company.service.ts`). Every model in `shared/models/` rewritten to match the backend types (`adresse.ts`→`address.ts`, `chantier.ts`→`project.ts`, `entreprise.ts`→`company.ts`, `fournisseur.ts`→`supplier.ts`, `ressource.ts`→`resource.ts`, and the two `document-ligne.ts`/`document_ligne.ts` files — which had drifted apart — consolidated into a single `document-line.ts`). `app.routes.ts` updated with the new paths (`/suppliers`, `/projects`, `/resources`) mirroring the renamed backend routes; these paths weren't explicitly requested but follow directly from the module renames. Decision made along the way about UI text (see above): stays in French. Verified: clean `npx tsc --noEmit`, clean `ng build` (templates included, no binding errors), `npm test` (7/8 — the only failure, `app.spec.ts`, predates the migration: confirmed by re-running it against the pre-migration code via `git stash`, where it fails identically — `ActivatedRoute` not provided in the default-generated smoke test's TestBed, unrelated to this migration).
4. ✅ **Docs** — done. `zz_docs/*.md` renamed and translated (`Définition du projet.md`→`Project Definition.md`, `Définition des données.md`→`Data Definition.md`, `Décisions.md`→`Decisions.md`, `Architecture.md` translated in place), `zz_docs/note/` translated in place, `README.md` and `CLAUDE.md` updated (routes table, project structure tree, domain model section, doc links). Along the way, a full repo sweep turned up `backend/http_test/*.http` (manual REST-client scratch files) — missed during phase 2 since they're not compiled/type-checked — renamed and updated to the new routes/field names too (`adresse.http`→`address.http`, `chantier.http`→`project.http`, `entreprise.http`→`company.http`, `fournisseur.http`→`supplier.http`, `ressource.http`→`resource.http`, `ressource_tarif_fournisseur.http`→`resource_supplier_price.http`, `type_chantier.http`→`project_type.http`).
