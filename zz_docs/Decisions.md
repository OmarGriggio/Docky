# Decisions log

This file tracks technical choices that had more than one reasonable option, along with the why — not just "what was done" (already in `CLAUDE.md` and git history), but **what was turned down and why**. Check here before reopening a decision.

## Hosting: a real VM (Infomaniak) over a PaaS, Nginx over Caddy

**Context**: needed somewhere to run backend + Postgres in "prod", free-or-cheap, that doesn't sleep on inactivity, and — since this is a learning project — chosen partly for what it teaches.

**Options compared**: Cloud Run / Railway (easy, but hide the OS/reverse proxy entirely, and Railway lost its free tier) · Oracle Free VM (generous specs, flaky provisioning) · GCP `e2-micro` (free, but 1GB RAM risks OOM during a rebuild) · Hetzner (cheap, reliable, no free tier) · **Infomaniak (chosen)**: same price bracket as Hetzner, but Swiss-hosted — a real differentiator for a SaaS aimed at Swiss construction companies (data sovereignty, CHF billing, French support).

**A real VM over any PaaS, deliberately**: more work (SSH hardening, Docker by hand, firewall, hand-rolled reverse proxy, manual redeploy) — but that work is the point for a CV-driven learning project; a PaaS would teach almost nothing about how a server actually works.

**Nginx over Caddy**: Caddy is simpler (automatic HTTPS, one-line config), but Nginx is the more recognized skill for a CV, and doing the manual certbot step once is itself worth having done. Chosen for résumé value, not technical superiority here.

**Two firewalls**: `ufw` alone wasn't enough — Infomaniak's Cloud panel has its own network firewall too. See [Difficulties.md](Difficulties.md) for how that got found.

**HTTPS without buying a domain**: Let's Encrypt won't certify a bare IP. **Chosen**: [sslip.io](https://sslip.io) — a free service that resolves `<ip-with-dashes>.sslip.io` to that IP automatically, no signup, no DNS to manage — good enough for Let's Encrypt to treat as a real hostname and issue a trusted cert against. **Turned down**: buying a real domain (the actual "right" answer eventually, just deferred — costs money and this is a learning/portfolio project first); a self-signed cert (free, but browsers show a hard warning, worse than plain HTTP for a first impression).

**CI/CD build strategy**: GitHub Actions gates deploy on tests passing, then SSHes in and runs the same `docker compose ... --build` the manual redeploy always used — builds happen on the VPS itself. **Turned down (for now)**: building images in CI and pushing to a registry (ghcr.io) so the VPS only pulls — lighter load on a "Lite" VPS plan, but real added setup (registry auth, compose pointing at image tags instead of build contexts). Revisit if the VPS ever struggles with the build load; not worth the complexity pre-emptively.

## Invoicing schema gaps

Surfaced by comparing Docky against Odoo's invoicing app; worked through schema-first, then matching backend logic.

**1. Document numbering** — was `UNIQUE` globally (would've blocked two companies both using `INVOICE-2026-0001`); changed to `UNIQUE (company_id, number)`. Generated in `document.service.ts` as `{OFF|FAC}-{year}-{4-digit seq}` (French prefixes, matching the seed data/PDF convention — not `INV_YYYY_00001` as first floated). Sequence found via `LIKE 'FAC-2026-%' ORDER BY number DESC LIMIT 1` rather than a counter table — works because the zero-padded suffix keeps lexicographic and numeric order in sync; simpler for this project's write volume, revisit only on a real collision.

**2. Client address on a document** — considered snapshotting the address (or a `billing_address_id` FK) so a document's printed address can't drift if the client's address is later edited. **Turned down for now**: still resolved dynamically from the client's primary address; simpler, no schema change, revisit if it causes a real problem.

**3. Flexible document lines** — settled on a real `document_sections` table (`id`, `company_id`, `document_id`, `position`, `title`, `is_active`), with `document_lines.section_id NOT NULL` referencing it, `position` on a line scoped to its section, and `document_lines.type` back to `MATERIAL`/`SERVICE` only (both always priced, `quantity`/`unit_price` `NOT NULL`). **Turned down first, then reopened**: a flat `document_lines` list with `SECTION`/`NOTE` as extra `type` values acting as in-list markers, no join — matched how Odoo's own invoice lines work, tried first (2026-09-02), reversed (2026-09-09) once a per-section subtotal turned out to be needed after all; see [Difficulties.md](Difficulties.md) for why the flat version couldn't answer that. The invoice and quote PDFs print sections (a per-section recap on page 1, the itemized lines per section after it).

**4. VAT and payment terms** — added `vat_rate NUMERIC(5,2)` on `documents` (one rate per document, not per line — Switzerland has a single standard rate), applied by `computeDocumentTotals`. Plus `payment_terms TEXT` and `due_date DATE` as two separate, directly-set columns (no parsing one from the other).

**Verified**: fresh-Postgres migration, `tsc`/tests green, live end-to-end (auto-numbering, forced-null section line, VAT math, PDF still renders).

## Refresh tokens: httpOnly cookie + DB-tracked, no rotation, reactive interceptor

**1. Where the token lives** — `httpOnly` cookie (current, `SameSite=Lax`, `Path=/`): frontend JS can never read it, mitigating XSS token theft. Back/front turned out to already be same-site in every real deployment shape (`ng serve`'s proxy in dev, nginx in prod), so the CSRF surface this opens is small and `SameSite=Lax` covers it as a first pass. **Turned down**: `localStorage` — picked first, then revised once XSS mitigation mattered more than the convenience it offered (see [Difficulties.md](Difficulties.md)); in-memory-only (safest, but logs the user out on every refresh without also adding a cookie for silent refresh).

**2. Can the backend revoke it early** — DB-tracked, no rotation (chosen): a `refresh_tokens` table (`user_id`, `token_hash`, `expires_at`, `revoked_at`, only the hash stored) lets `/auth/logout` actually invalidate server-side. **Turned down**: fully stateless (zero new table, but a stolen/logged-out token stays valid its full 7 days); rotation (most secure, detects reuse as a compromise signal, but real added complexity for a solo project with no real client data yet — natural next step if this needs hardening).

**3. How refresh is triggered** — reactive inside `auth.interceptor.ts` (chosen): already catches 401s, extended to retry once after a refresh; concurrent 401s dedupe through one cached in-flight `Observable`. **Turned down**: a proactive timer — avoids ever failing first, but an extra moving part for marginal gain.

## Archive instead of delete (`is_active`)

**Choice**: `is_active BOOLEAN DEFAULT TRUE` on clients/suppliers/projects/documents/resources; `PATCH /:id/archive`/`/:id/unarchive` replace `DELETE`.

- **For**: invoicing data should never truly disappear (accounting traceability); reversible; reuses a pattern that already half-existed.
- **Against**: one more thing to filter everywhere (`WHERE is_active = true`); doesn't address GDPR deletion requests (not urgent, no real client data yet).
- **Turned down**: keeping both `DELETE` and archive — one action per row is simpler to maintain on both sides.

## Identifier for archive/unarchive routes: `:id` everywhere

`PATCH /client/:id/archive` (numeric id in the URL) instead of the old `DELETE /client` taking `client_number` in the body — consistent with `project`/`document`, more RESTful, a single kind of identifier to document. Cost: a real API contract change, not just an addition.

## Rate limiting: 20 attempts / 15 min, in-memory

`express-rate-limit`, in-process counter (not Redis) — zero extra infra, plenty for a single backend instance; 20 rather than the usual 5-10 default so a mistyped password twice doesn't lock someone out. Limit: if several backend instances ever run behind a load balancer, each keeps its own counter (real limit becomes `20 × instances`) — not a problem with a single container.

**Related**: `app.set("trust proxy", 1)` added even without a load balancer of Omar's own, since most hosts already proxy traffic on even a "no infra" plan — without it `req.ip` would always be the proxy's IP and rate limiting would silently become useless.

## Dockerfile: a single multi-stage file (`dev`/`build`/`prod`)

One `Dockerfile` with `dev`/`build`/`prod` stages selected via `target:` — single source of truth for shared steps, dev flow unchanged, prod image stays separate and lighter (269 MB vs 315 MB measured). **Turned down**: two separate files — simpler in isolation, but duplicates shared steps and is easy to let drift.

## API URLs: `environment.ts` (native Angular) rather than a runtime config

`environment.ts`/`environment.prod.ts` swapped at build time via `angular.json`'s `fileReplacements` — standard mechanism, no dependency, no secret involved so both files can be committed. Limit: the prod URL is frozen at build time — a runtime `config.json` would be needed if the same image ever had to serve several environments; not needed now.

## Initial bundle too big: lazy-loading routes, not raising the budget

Every route in `app.routes.ts` uses `loadComponent` — fixed the actual cause (the whole app loading at once) rather than the symptom: 1.21 MB → 485 KB initial. **Turned down**: just raising the `angular.json` budget — would have hidden a real problem instead of fixing it.

## i18n: Transloco (runtime) over `@angular/localize` (compile-time)

Language is a per-user setting (`users.language`), switchable without a reload — Transloco loads `public/i18n/{lang}.json` at runtime via `TranslocoService`, one single build either way. **Turned down**: `@angular/localize` — translates at compile time, so changing language means loading a *different build* (its own bundle per locale), which doesn't fit a setting toggled live in the app, and would need a multi-bundle build/nginx setup this project doesn't have.

## Error handling: an `AppError` hierarchy + a single middleware

`NotFoundError`/`ConflictError`/`UnauthorizedError`/`ForbiddenError` (all `extends AppError`), one error middleware at the end of `app.ts`, no `try/catch` in controllers — Express 5 forwards rejected promises automatically. Depends on Express 5 (4 would've needed a wrapper); not an issue, already on 5.

## Roles: `company_id` stays `NOT NULL`, platform admin created by hand

**Choice**: no nullable column, no separate table — `company_id` stays required even for `PLATFORM_ADMIN` (assigned a real company, unrelated to their permissions which come solely from `role`). No API creates a `PLATFORM_ADMIN`; inserted by hand in the DB.

- **For**: zero type change elsewhere (`company_id: number` stays true everywhere); the `NOT NULL` constraint itself blocks any other creation path; sufficient while there's no need for plural "platform staff".
- **Turned down**: nullable `company_id` (more correct conceptually, but `number | null` threaded through every controller using `req.user.company_id`, for no current need); a separate `platform_admins` table (architecturally cleanest, but doubles auth/login logic — worth it only as a real commercial product with a support team).
- **Cross-company access ("impersonation") — built (2026-09-15)**: `POST /auth/impersonate/:companyId` (`PLATFORM_ADMIN` only) issues a **new access token with that company's `company_id` swapped in, but `role` staying `PLATFORM_ADMIN`** (not switched to `ADMIN`) — every endpoint's own `req.user.company_id` scoping does the rest for free, nothing else needed touching for that part. The frontend keeps the platform admin's real token in a second `localStorage` slot (`AuthService.impersonateCompany`/`returnToPlatformView`) to switch companies or return to the platform view without a backend round-trip. Chosen over a nullable `company_id` + `?company=X` param specifically because every existing endpoint already trusts `req.user.company_id` unconditionally.
  - **Refresh-token question, resolved**: left deliberately unsolved rather than taught to `POST /auth/refresh` — an impersonated session is capped at one access token's lifetime (5h) and isn't renewable through refresh; once it expires the frontend asks the platform admin to pick the company again. Simpler than carrying the borrowed `company_id` through the refresh token too, and avoids a silent, unnoticed drop back to the platform admin's own company mid-session.
  - **User management, centralized rather than widened**: `GET /user`, `DELETE /user/:id` and `createUserService`'s authenticated branch are `PLATFORM_ADMIN`-only, full stop — an ordinary company `ADMIN` no longer manages their own company's users, a `PLATFORM_ADMIN` does it by impersonating that company first (see [Difficulties.md](Difficulties.md) for why widening every `ADMIN` check instead wasn't the pick). **Matters for the demo account** (see README's Live demo): it logs in as a plain `ADMIN`, never `PLATFORM_ADMIN`, so a recruiter poking around it never reaches user management, login history, or the company picker.

## `POST /user`: a single route for two uses (public registration + adding an employee)

Kept one `POST /user`, no `authenticate` at the route level — `createUserService` tells "public registration" and "admin adding an employee" apart by whether a valid token is present (can't be logged in before your account exists). **Hardened twice** (see [Difficulties.md](Difficulties.md)): the unauthenticated path first let anyone add themselves as `ADMIN` on any existing `company_id` by guessing it; then it was limited to a company with zero users yet - which still let anyone claim a company created but not yet given a user. **Now (2026-10-22)**: the public path takes a `companyName` and creates the company and its first `ADMIN` in one transaction, it never takes a `company_id` at all, and `POST /company` is `PLATFORM_ADMIN` only. **Turned down**: keeping the two calls and only rate-limiting them (the claim stays possible, just slower).

## File storage: self-hosted MinIO (S3 API), not local disk

**First version**: `company.upload.ts` wrote logos to the backend container's local disk. Two bugs fixed along the way (a test logo committed to git; a persistence volume line mounted on the wrong service). **The real problem**: the `prod` image had no persistence for `/app/uploads` at all — an upload vanished on the next redeploy.

**Settled**: a MinIO container next to Postgres, in both dev and prod compose files, reached through the AWS S3 SDK (`shared/storage/storage.service.ts`) - logos, invoice header images and project attachments all live there now, in a `minio_data` volume. Same code would work against a real S3/R2 by changing only the `S3_*` env vars. **Why MinIO over a plain volume or a hosted S3/R2**: not recorded when the switch was made - TODO, fill in.

**Public vs private files** (2026-10-22): logos have to be readable by a plain `<img>` (no token), so `GET /uploads/*splat` stays unauthenticated - but it now only serves the logo/header key pattern; attachments, in the same bucket, go through their own authenticated, company-scoped route. **Turned down**: two buckets (cleaner separation, but a second bucket to create and configure for one rule a regex already expresses).

## PDFs in the client's language, labels in a plain dictionary (2026-10-22)

A quote, invoice or reminder is read by the **client**, so it's printed in `clients.language`, not in the logged-in user's UI language. The ~35 fixed strings (headings, table columns, QR-bill labels, the default greeting, the default reminder text) live in one `PDF_LABELS.FR`/`.EN` object (`pdf/templates/pdf-labels.ts`), dates through `toLocaleDateString` with `fr-CH`/`en-GB`. DE/IT clients fall back to French until someone writes those labels. **Turned down**: the user's UI language (wrong reader); a backend i18n library like i18next (a dependency, loaders and key files for a few dozen strings that never change at runtime); reusing the frontend's Transloco JSON (different strings, different reader, and the backend would need to read the frontend's files). This replaced the earlier "QR-bill labels stay French, printed content" rule from the vocabulary migration below.

## A quote's PDF prints its stored totals, VAT included (2026-10-22)

The quote PDF used to add up `quantity × unit_price` on its own and print one "Total", while the app (and the `{{montant}}` placeholder on that same PDF) showed the stored `amount_incl_vat` - with the document's discount and VAT applied. A client could sign one figure and be invoiced another. **Chosen**: the same totals block as the invoice (discount, total excl. VAT, VAT, total incl. VAT), from the stored amounts, and per-line totals through the same `lineTotal` the backend computes with. **Turned down**: declaring that a quote has no VAT or discount (force both to 0 server-side) - the form already computes and shows a VAT-inclusive total for quotes, and a Swiss private client expects prices incl. VAT.

## Saving a document's content: one transactional "replace everything" endpoint (2026-10-22)

The frontend used to save a document's sections/lines by archiving each one and recreating each one, one HTTP request per line - a dropped connection halfway left a document half-empty (and its stored total with it), and a failure right after `POST /document` left an empty draft that had already used up a number. **Chosen**: `PUT /document/:id/content` takes the whole draft and does the archive-all + recreate-all in one database transaction, totals recomputed once; both the document form and a chantier's resource page use it. Kept the archive-and-recreate approach itself (lines get new ids on every save) - the frontend edits a local draft anyway. **Turned down**: per-line diffing with update endpoints (keeps ids stable, but several new endpoints and diff logic on both sides for no current need); keeping one request per line (not atomic, slow on a big document).

**How transactions are passed down**: `withTransaction(work)` + `db()` in `shared/config/database.ts`, with the transaction's connection carried by Node's `AsyncLocalStorage` - repositories call `db().query(...)` and automatically join whatever transaction is running. **Turned down**: an explicit `client` parameter on every repository function (the textbook way, but threaded through every service and every call site for the three flows that need it).

## A sent invoice is frozen: cancel and duplicate to correct it (2026-10-22)

An invoice is editable only as a `DRAFT`; once `SENT` its header, sections and lines are locked server-side, and its status only moves forward (`PAID` or `CANCELLED`, never back to `DRAFT`). To correct one, it's cancelled and duplicated into a new invoice with a new number. The client holds the sent invoice under its number - rewriting it afterwards would leave two different documents with the same number (and a reminder quoting an amount that doesn't match the one the client has), which Swiss bookkeeping (art. 957a CO) doesn't allow. **Turned down**: keeping `SENT` editable (what the app did until then); a dedicated credit note (avoir) document type - the proper accounting answer, but a new type with its own numbering and PDF, more than "cancel + duplicate" is worth for now. A quote, on the other hand, stays editable while `SENT`: nothing is owed yet, and it's routinely adjusted after talking with the client.

## A document without a client: one "Non défini" client + the recipient on the document (2026-10-26)

A quote or invoice sometimes goes to someone who isn't worth adding as a client - the user types the name and address instead. **Chosen**: each company has one fixed **"Non défini"** client (`clients.is_placeholder`) that such a document points at, and the typed-in recipient is stored on the document itself (`recipient_*` columns), printed instead of a client's address. `documents.client_id` stays `NOT NULL`, so the PDF, QR-bill, reminder, dashboard, chantier and every tenant check keep working with almost no change, the clients list stays clean, and the printed address is frozen on the document. **Turned down**: making `client_id` nullable with the recipient on the document (the "purest" model, but every place that reads a document's client - PDF greeting/language, dashboard grouping, a chantier's client - would have needed a no-client branch); auto-creating a hidden one-off client per document (no change elsewhere either, but the clients table fills up with hidden rows). **Limits accepted**: such documents share the placeholder's greeting and language (Madame, Monsieur / FR) and are grouped under "Non défini" in the dashboard; a chantier born from one is named after its recipient so the list still says who it's for.

## One invoice per chantier, unless cancelled (2026-10-22)

`POST /document` refuses a second invoice for a chantier already invoiced (409); a cancelled or archived invoice doesn't count, so a wrong invoice gets cancelled and redone. **Turned down**: several partial invoices per chantier (deposits, progress billing - real in construction, but a feature of its own: what's left to bill, which lines each invoice covers). Revisit if progress billing is ever asked for.

## Tests: start with unit tests on pure logic only

First tests ever on this project (2026-09-02), Omar's first on any personal project — goal was understanding, not a green CI for its own sake. **Considered and set aside**: a full integration setup (dedicated test Postgres, `.env.test`, Supertest against the whole Express stack) — not wrong, stays the right target later, but all at once it would have complicated the project faster than it built understanding.

**Choice made**: unit tests on pure functions only (no DB, no network, nothing async) — see `CLAUDE.md`'s Testing section for the pattern. Covers only a small fraction of the code (the real bugs found that day — broken SQL inserts, endpoints missing `authenticate` — are exactly what only an integration test would catch), but each step is small and verifiable, building confidence before adding machinery. Revisit with the same small-steps method once ready.

**Revisited 2026-10-30 - backend integration tests added**, the target set aside above: Vitest + Supertest against the whole Express app, on a real Postgres. **For the database, Testcontainers** (a throwaway Postgres 17 started in Docker for each run, built from the same migration files as production) **over a fixed `docky_test` database** in the dev container: that one starts faster, but has to be reset by hand between runs and set up separately in CI, where Testcontainers needs nothing (the runner has Docker). **Turned down**: an in-memory fake Postgres (`pg-mem`) - it wouldn't run the real SQL, which is exactly what these tests are for. Unit tests stay `npm test`, instant and Docker-free; the integration ones are `npm run test:integration`. Their first run found a real bug (two logins within the same second → a 500, see [Difficulties.md](Difficulties.md)). Browser E2E (Playwright) still set aside: the rules that matter are enforced by the server, so that's where a test pays off most.

## Full vocabulary migration, French → English (2026-09-02)

**Context**: the project started with French business vocabulary (tables, columns, folders, docs) alongside English technical code — decided to move everything to English, including doc content, as the project's one main language.

**What stays French**: the seed data content (`001_data.sql` — names, Swiss addresses, business text — a realistic dataset, translating it would be pointless) and the frontend's user-facing text (labels, buttons, messages — the product as seen by a French-speaking Swiss end user). Only code identifiers move to English.

**Glossary** (reference):

| French | English |
|---|---|
| `entreprise(s)` | `company` / `companies` |
| `utilisateur(s)` | `user(s)` |
| `adresse(s)` | `address(es)` |
| `chantier(s)` / `type_chantier` | `project(s)` / `project_type(s)` *(shorter than "construction site", chosen knowingly)* |
| `fournisseur(s)` | `supplier(s)` |
| `ressource(s)` / `ressources_tarifs_fournisseurs` | `resource(s)` / `resource_supplier_prices` |
| `document_ligne(s)` | `document_line(s)` |
| `id_entreprise` | `company_id` |
| `actif` | `is_active` |
| `nom` / `prenom` | `last_name` / `first_name` |
| `societe` | `company_name` (client) / `name` (supplier) |
| `telephone` | `phone` |
| `rue` / `npa` / `ville` / `pays` | `street` / `postal_code` / `city` / `country` |
| `remarque` / `statut` / `rabais` / `numero` | `note` / `status` / `discount` / `number` |
| `montant_ht` / `montant_ttc` | `amount_excl_vat` / `amount_incl_vat` |
| `principale` / `libelle` | `is_primary` / `label` |
| `quantite` / `prix_unitaire` | `quantity` / `unit_price` |
| `date_creation` / `date_modif` | `created_at` / `updated_at` |
| `motdepasse_hash` / `date_derniere_connexion` | `password_hash` / `last_login_at` |
| Roles `UTILISATEUR`/`ADMIN_PLATEFORME` | `USER`/`PLATFORM_ADMIN` (`ADMIN` unchanged) |
| Client type `PARTICULIER`/`PROFESSIONNEL` | `INDIVIDUAL`/`PROFESSIONAL` |
| Resource type `MATERIEL`/`MAIN-OEUVRE`/`SOUS-TRAITANCE`/`DIVERS` | `MATERIAL`/`LABOR`/`SUBCONTRACTING`/`OTHER` *(later simplified to `MATERIAL`/`SERVICE`)* |
| Document type `OFFRE`/`FACTURE` | `QUOTE`/`INVOICE` |
| Document status `BROUILLON`/`ENVOYE`/`ACCEPTE`/`REFUSE`/`PAYE`/`ANNULE` | `DRAFT`/`SENT`/`ACCEPTED`/`REJECTED`/`PAID`/`CANCELLED` |

**Execution, 4 phases, one at a time with verification in between** — all ✅ done:
1. **Schema** — verified against a fresh Postgres (row counts, enum values, amounts).
2. **Backend** — every module renamed (folders/files/types/fields) and every URL path moved to English; `project_types` turned out to be a global lookup table not covered by the glossary, fixed by reading the real schema. QR-bill error messages moved to English; the payment-slip labels themselves stayed French (printed content, not naming) - since 2026-10-22 they follow the client's language instead, see "PDFs in the client's language" above. Verified via clean `tsc`, green tests, and a full fresh-Postgres end-to-end pass including PDF generation.
3. **Frontend** — every feature module and shared model renamed to match; `app.routes.ts` updated; UI text deliberately stays French (see above). Verified via clean `tsc`, clean `ng build`, and tests (7/8 — the one failure predates the migration, confirmed via `git stash`).
4. **Docs** — `zz_docs/*.md` renamed and translated, `README.md`/`CLAUDE.md` updated. A repo sweep also caught `backend/http_test/*.http` scratch files (missed in phase 2 since they're not type-checked), renamed and updated too.

## Demo company's seed data: English, not French (2026-10-09)

Company 2 (Rénov Alpes, handed to recruiters) got its own English content once the app itself became bilingual (Transloco) — a recruiter is far more likely to read English than French, so the demo should default to the language they'll actually use, not the developer's own company's convention (company 1 stays French). Its admin's `users.language` defaults to `'EN'` to match. **Turned down**: translating company 1 too, or picking a language per visitor - company 1 is the developer's own data (stays French on purpose, see the "English everywhere" bullet's exceptions in CLAUDE.md), and there's no visitor-facing language picker before login to make a per-visitor default meaningful.
