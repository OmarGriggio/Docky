# Decisions log

This file tracks technical choices that had more than one reasonable option, along with the why — not just "what was done" (already in `CLAUDE.md` and git history), but **what was turned down and why**. Check here before reopening a decision.

## Hosting: a real VM (Infomaniak) over a PaaS, Nginx over Caddy

**Context**: needed somewhere to run backend + Postgres in "prod", free-or-cheap, that doesn't sleep on inactivity, and — since this is a learning project — chosen partly for what it teaches.

**Options compared**: Cloud Run / Railway (easy, but hide the OS/reverse proxy entirely, and Railway lost its free tier) · Oracle Free VM (generous specs, flaky provisioning) · GCP `e2-micro` (free, but 1GB RAM risks OOM during a rebuild) · Hetzner (cheap, reliable, no free tier) · **Infomaniak (chosen)**: same price bracket as Hetzner, but Swiss-hosted — a real differentiator for a SaaS aimed at Swiss construction companies (data sovereignty, CHF billing, French support).

**A real VM over any PaaS, deliberately**: more work (SSH hardening, Docker by hand, firewall, hand-rolled reverse proxy, manual redeploy) — but that work is the point for a CV-driven learning project; a PaaS would teach almost nothing about how a server actually works.

**Nginx over Caddy**: Caddy is simpler (automatic HTTPS, one-line config), but Nginx is the more recognized skill for a CV, and doing the manual certbot step once is itself worth having done. Chosen for résumé value, not technical superiority here.

**Two firewalls, found the hard way**: `ufw` alone wasn't enough — Infomaniak's Cloud panel has its own network firewall (SSH-only by default) that silently swallowed 80/443 even with `ufw`/Nginx correctly configured. Worth checking first on any cloud VM that's unreachable despite the OS looking right.

**HTTPS without buying a domain**: Let's Encrypt won't certify a bare IP. **Chosen**: [sslip.io](https://sslip.io) — a free service that resolves `<ip-with-dashes>.sslip.io` to that IP automatically, no signup, no DNS to manage — good enough for Let's Encrypt to treat as a real hostname and issue a trusted cert against. **Turned down**: buying a real domain (the actual "right" answer eventually, just deferred — costs money and this is a learning/portfolio project first); a self-signed cert (free, but browsers show a hard warning, worse than plain HTTP for a first impression).

**CI/CD build strategy**: GitHub Actions gates deploy on tests passing, then SSHes in and runs the same `docker compose ... --build` the manual redeploy always used — builds happen on the VPS itself. **Turned down (for now)**: building images in CI and pushing to a registry (ghcr.io) so the VPS only pulls — lighter load on a "Lite" VPS plan, but real added setup (registry auth, compose pointing at image tags instead of build contexts). Revisit if the VPS ever struggles with the build load; not worth the complexity pre-emptively.

## Invoicing schema gaps

Surfaced by comparing Docky against Odoo's invoicing app; worked through schema-first, then matching backend logic.

**1. Document numbering** — was `UNIQUE` globally (would've blocked two companies both using `INVOICE-2026-0001`); changed to `UNIQUE (company_id, number)`. Generated in `document.service.ts` as `{OFF|FAC}-{year}-{4-digit seq}` (French prefixes, matching the seed data/PDF convention — not `INV_YYYY_00001` as first floated). Sequence found via `LIKE 'FAC-2026-%' ORDER BY number DESC LIMIT 1` rather than a counter table — works because the zero-padded suffix keeps lexicographic and numeric order in sync; simpler for this project's write volume, revisit only on a real collision.

**2. Client address on a document** — considered snapshotting the address (or a `billing_address_id` FK) so a document's printed address can't drift if the client's address is later edited. **Turned down for now**: still resolved dynamically from the client's primary address; simpler, no schema change, revisit if it causes a real problem.

**3. Flexible document lines** — **originally chosen** (2026-09-02): keep `document_lines` a flat list ordered by `position`, add `SECTION`/`NOTE` as two more `type` values alongside `MATERIAL`/`SERVICE`, no hierarchy — matched how Odoo's own invoice lines work, and avoided a `document_sections` table + `section_id` (a join, two position spaces to sync) for a feature nobody had asked for yet.

**Reopened and reversed (2026-09-09)**: once the `document-form-v2` frontend prototype (sections holding typed lines, with a per-section subtotal) made clear that section subtotals *were* wanted after all, the flat-marker-line approach stopped being enough — a `SECTION` line has no way to know where "its" lines end other than "everything up to the next `SECTION` line," which can't answer "what's this section's subtotal" without walking the whole list. Switched to the originally-turned-down option: a real `document_sections` table (`id`, `company_id`, `document_id`, `position`, `title`, `is_active`), with `document_lines.section_id NOT NULL` referencing it. `document_lines.type` dropped back to `MATERIAL`/`SERVICE` only (no more `SECTION`/`NOTE` — grouping is the section table's job now), and `quantity`/`unit_price` went back to `NOT NULL` since every remaining line type is always priced. `position` on a line is now scoped to its section, not the whole document. **Not done yet**: PDF section headers (see `document_lines` bullet in `CLAUDE.md`).

**4. VAT and payment terms** — added `vat_rate NUMERIC(5,2)` on `documents` (one rate per document, not per line — Switzerland has a single standard rate), applied by `computeDocumentTotals`. Plus `payment_terms TEXT` and `due_date DATE` as two separate, directly-set columns (no parsing one from the other).

**Verified**: fresh-Postgres migration, `tsc`/tests green, live end-to-end (auto-numbering, forced-null section line, VAT math, PDF still renders).

## Refresh tokens: httpOnly cookie + DB-tracked, no rotation, reactive interceptor

**1. Where the token lives** — `httpOnly` cookie (current, `SameSite=Lax`, `Path=/`): frontend JS can never read it, mitigating XSS token theft. **Revised from an earlier choice**: `localStorage` (trivial, consistent with the access token, no CORS change) was picked first specifically to avoid `cors({credentials:true})` + CSRF work while the CORS gap was still deferred — revisited once XSS mitigation mattered more than that convenience; back/front turned out to already be same-site in every real deployment shape (`ng serve`'s proxy in dev, nginx in prod), so the CSRF surface this opens is small and `SameSite=Lax` covers it as a first pass. **Turned down**: in-memory-only (safest, but logs the user out on every refresh without also adding a cookie for silent refresh).

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

## Error handling: an `AppError` hierarchy + a single middleware

`NotFoundError`/`ConflictError`/`UnauthorizedError`/`ForbiddenError` (all `extends AppError`), one error middleware at the end of `app.ts`, no `try/catch` in controllers — Express 5 forwards rejected promises automatically. Depends on Express 5 (4 would've needed a wrapper); not an issue, already on 5.

## Roles: `company_id` stays `NOT NULL`, platform admin created by hand

**Choice**: no nullable column, no separate table — `company_id` stays required even for `PLATFORM_ADMIN` (assigned a real company, unrelated to their permissions which come solely from `role`). No API creates a `PLATFORM_ADMIN`; inserted by hand in the DB.

- **For**: zero type change elsewhere (`company_id: number` stays true everywhere); the `NOT NULL` constraint itself blocks any other creation path; sufficient while there's no need for plural "platform staff".
- **Turned down**: nullable `company_id` (more correct conceptually, but `number | null` threaded through every controller using `req.user.company_id`, for no current need); a separate `platform_admins` table (architecturally cleanest, but doubles auth/login logic — worth it only as a real commercial product with a support team).
- **Current scope**: a `PLATFORM_ADMIN` today has platform powers (list/edit any company) **and** acts as a normal `ADMIN` on their *own* company only — doesn't see other companies' data. Full cross-company access is wanted eventually but deliberately deferred (2026-09-01).
- **Cross-company access, decided direction (2026-09-09), not yet built**: "impersonation" — login shows a `PLATFORM_ADMIN` the company list (`GET /company`, already `requireRole("PLATFORM_ADMIN")`), picking one issues a **new access token with that company's `company_id` swapped in, but `role` staying `PLATFORM_ADMIN`** (not switched to `ADMIN`) — so they can move between companies without re-authenticating each time, and the frontend keeps their real platform-admin token in a second `localStorage` slot to switch companies or return to the platform view. Chosen over the `company_id` nullable + `?company=X` param alternative specifically because every existing endpoint already trusts `req.user.company_id` unconditionally — a swapped-in `company_id` in the token makes the entire existing multi-tenant scoping work for free, no endpoint needs touching for that part.
  - **Known consequence, not yet applied**: a few places check `role === "ADMIN"` *strictly* rather than "`ADMIN` or `PLATFORM_ADMIN`" — `user.routes.ts` (`GET /user`, `DELETE /user/:id`, both `requireRole("ADMIN")`) and `user.service.ts`'s `createUserService` (rejects unless `actor.role === "ADMIN"`). These would block a `PLATFORM_ADMIN` acting on a borrowed `company_id` from doing actual admin actions there, unless updated to accept both roles — same pattern `company.routes.ts`'s ownership checks already use.
  - **Left open, needs a decision before this is built**: how the refresh-token flow interacts with an impersonated session. `POST /auth/refresh` currently rebuilds the new access token entirely from the refresh token's own payload — if that payload doesn't also carry the borrowed `company_id`, an automatic refresh mid-session (access tokens expire after 5h) would silently drop the platform admin back to their own company without them noticing.

## `POST /user`: a single route for two uses (public registration + adding an employee)

Kept one `POST /user`, no `authenticate` at the route level — `createUserService` tells "public registration" and "admin adding an employee" apart by whether a valid token is present. Matches the frontend's existing `POST /company` → `POST /user` registration flow (can't be logged in before your account exists). **Hardened along the way**: the unauthenticated path used to let anyone add themselves as `ADMIN` on any existing `company_id` by guessing it — now only works if that company has zero users yet, so it can only bootstrap a brand-new company.

## Logo storage: local disk for now, decision deferred to the choice of host

`company.upload.ts` writes logos to the backend container's local disk. Two bugs fixed along the way (a test logo committed to git; a persistence volume line mounted on the wrong service — removed, since the existing `./backend:/app` dev bind mount already covers it). **The real problem**: the `prod` image has no persistence for `/app/uploads` at all — an upload vanishes on next restart/redeploy. **Not settled, depends on the host**: a persistent volume (simple, only if the host offers one) vs. S3-compatible storage like Cloudflare R2 (works anywhere, survives redeploys, adds an external account/API key). To be settled once the prod host is chosen.

## Tests: start with unit tests on pure logic only

First tests ever on this project (2026-09-02), Omar's first on any personal project — goal was understanding, not a green CI for its own sake. **Considered and set aside**: a full integration setup (dedicated test Postgres, `.env.test`, Supertest against the whole Express stack) — not wrong, stays the right target later, but all at once it would have complicated the project faster than it built understanding.

**Choice made**: unit tests on pure functions only (no DB, no network, nothing async) — see `CLAUDE.md`'s Testing section for the pattern. Covers only a small fraction of the code (the real bugs found that day — broken SQL inserts, endpoints missing `authenticate` — are exactly what only an integration test would catch), but each step is small and verifiable, building confidence before adding machinery. Revisit with the same small-steps method once ready.

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
2. **Backend** — every module renamed (folders/files/types/fields) and every URL path moved to English; `project_types` turned out to be a global lookup table not covered by the glossary, fixed by reading the real schema. QR-bill error messages moved to English; the payment-slip labels themselves stay French (printed content, not naming). Verified via clean `tsc`, green tests, and a full fresh-Postgres end-to-end pass including PDF generation.
3. **Frontend** — every feature module and shared model renamed to match; `app.routes.ts` updated; UI text deliberately stays French (see above). Verified via clean `tsc`, clean `ng build`, and tests (7/8 — the one failure predates the migration, confirmed via `git stash`).
4. **Docs** — `zz_docs/*.md` renamed and translated, `README.md`/`CLAUDE.md` updated. A repo sweep also caught `backend/http_test/*.http` scratch files (missed in phase 2 since they're not type-checked), renamed and updated too.
