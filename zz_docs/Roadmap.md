# Roadmap to a sellable product

Written 2026-11-13 (version 1.2.3), from an honest review of what Docky lacks to be sold. Worked through one item at a time, roughly in this order - tick an item once it's shipped, with its version.

**Where it stands**: technically above an average MVP (server-side business rules, audited tenant isolation, exact amounts, integration tests, CI/CD, verified backups, compliant QR-bills). What's missing is mostly what lets a customer use it **on their own** and what covers them **legally**.

**Rough distance**, solo and part-time:
- a few **pilot companies** (French-speaking, onboarded by hand): **2-3 months** - phases 1 and 2;
- a **self-service product** (found, paid for and used without the developer): **9-12+ months** - phase 3 too.

## Phase 1 - Before the first paying customer

- [ ] **Email sending** - the base the next items need (SMTP/transactional provider, sender domain, templates FR/EN).
  - [ ] **Forgot password** - today a customer who forgets it is stuck until someone edits the database.
  - [ ] Email verification on registration.
  - [ ] Sending quotes, invoices and reminders from the app, PDF attached (was already on the roadmap).
- [ ] **A company admin manages its own users** - adding, deactivating, resetting employees is `PLATFORM_ADMIN`-only today (see CLAUDE.md's Roles); a customer can't do it themselves.
- [ ] **Credit notes ("notes de crédit")** - only cancelling exists; a discount granted afterwards or a partial refund needs one.
- [ ] **Export for the accountant ("fiduciaire")** - invoices, payments (and credit notes) over a period, as CSV/Excel at least; ideally a format Bexio/Abacus/Banana import. Often the deciding point for a Swiss SME.
- [ ] **Date or period of the service on invoices** - required by art. 26 LTVA (VAT), not printed today. Check the exact wording with an accountant.
- [ ] **Legal framework**:
  - [ ] Terms of service and a privacy policy (nLPD), linked from the app.
  - [ ] A data processing agreement with each customer (Docky holds their own clients' data).
  - [ ] Disclose that the AI document scanner sends documents to Infomaniak.
  - [ ] Export / deletion of a company's data on request.
  - [ ] Ten-year retention of invoices (art. 958f CO) - largely in place (archive instead of delete, sent invoices frozen), to be guaranteed and documented.
- [ ] **Infrastructure**:
  - [ ] A real domain name and a professional email address (instead of `sslip.io`).
  - [ ] An off-server backup copy - losing the VPS loses the database and its backups together today.
  - [ ] Close the known security gaps: Content-Security-Policy, CORS restricted to the app's origin, refresh token rotation (see CLAUDE.md's Known gaps).
  - [ ] Two-factor authentication, at least for admins.

## Phase 2 - Real use, then pilots

- [ ] **Company 1 runs on Docky for real** for 2-3 months - the best test there is; note every friction.
- [ ] **Payment matching from a bank file** - import a camt.054/camt.053, match payments by their reference (in place since 1.2.3), propose a match for those without one, mark invoices paid once confirmed. Needs a real, anonymized camt file from a bank.
- [ ] **Reminder levels** - 1st, 2nd, 3rd reminder, fees, default interest; one reminder only today.
- [ ] **QR reference with a bank customer id (BESR-ID)** - some banks require one at the start of a QR reference with a QR-IBAN; a field to add if a pilot's bank does.
- [ ] **Deposits' ergonomics** - to be reworked (noted when they shipped in 1.2.0).
- [ ] **2-3 pilot companies** in French-speaking Switzerland, at a reduced price in exchange for feedback.

## Phase 3 - Selling beyond a few pilots

- [ ] **German** - UI and PDFs (DE/IT fall back to French today); two thirds of Switzerland. Without it, the market is Romandie only.
- [ ] **Billing the SaaS itself** - plans, trial period, payment (Stripe or a QR invoice), suspension when unpaid.
- [ ] **Support** - online help, a contact channel, a response time, and a plan for when the only developer is away.
- [ ] Stock module and long-term purchase tracking (README's earlier roadmap).

## Positioning

Competitors: Bexio, AbaNinja (free), Cashctrl, Banana for general invoicing; Sorba, Messerli for construction trades. Docky won't win on "quotes and invoices" in general - its angle is **the trade**: quote → chantier → invoice, deposits, site planning, simple and in French. Keep to that rather than becoming one more general invoicing tool.
