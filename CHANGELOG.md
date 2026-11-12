# Changelog

Every release of Docky, newest first. One version for the whole app (backend and frontend ship together from `main`), numbered `MAJOR.MINOR.PATCH` - see CLAUDE.md's Workflow for when each part goes up and how a release is made. Each release is tagged `vX.Y.Z` on `main`.

## [1.0.1] - 2026-11-12

### Changed
- A payment reminder and its QR-bill go to the client's current address, not the one its invoice was frozen with - a client may have moved since the invoice was sent.
- The app's version is shown under the user's email in the navigation bar, and returned by `GET /health`.

## [1.0.0] - 2026-11-12

First versioned release - everything built since July 2026, tagged as it stood in production:

- Clients (professionals and individuals, generated numbers, addresses with Swiss postcode suggestions), a catalog of materials and services (generated codes, units, reference numbers).
- Quotes and invoices with sections and lines, numbering, VAT, discounts, an early payment discount and its payment scale, lifecycle statuses, the address frozen once sent, Swiss QR-bill PDFs in the client's language and the company's colors, payment reminders.
- Chantiers created from accepted quotes, their resource ledger, attachments, invoicing, a planning calendar.
- Dashboard, a standalone QR-bill slip, an AI document scanner, document templates.
- Multi-company with roles and impersonation, FR/EN interface, installable PWA with a phone layout, error tracking, error toasts and unsaved-changes warnings.
