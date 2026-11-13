# Changelog

Every release of Docky, newest first. One version for the whole app (backend and frontend ship together from `main`), numbered `MAJOR.MINOR.PATCH` - see CLAUDE.md's Workflow for when each part goes up and how a release is made. Each release is tagged `vX.Y.Z` on `main`.

## [1.2.0] - 2026-11-13

### Added
- Deposit invoices ("factures d'acompte") on a chantier, from its new "Facturation" card: a percentage of the accepted quote's total incl. VAT, or an amount, at any time until the final invoice - an ordinary invoice of its own (numbering, PDF titled "FACTURE D'ACOMPTE", QR-bill, reminder), with a warning when the deposits would pass the quote.
- The chantier's "Facturation" card: the quote, what's been invoiced, received and is left to invoice, and each deposit.
- The final invoice deducts the deposits sent or paid: its PDF is titled "FACTURE FINALE", lists each deposit and the balance to pay, and the QR-bill, early payment discount, `{{montant}}`, payment reminder and dashboard all use that balance.
- Demo company: deposits and a final invoice to look at.

### Changed
- The documents list tags a deposit "Acompte" and a final invoice "Finale", and shows what's still due on it.

## [1.1.1] - 2026-11-13

### Changed
- Leaving a quote, an invoice or a client import with unsaved work asks in the app's own dialog ("Quitter sans enregistrer" / "Rester sur la page") instead of the browser's.
- The "complete your profile" banner also asks for the company's VAT number when it charges VAT.

### Fixed
- Opening a new invoice no longer raised a change detection error in the browser's console.

## [1.1.0] - 2026-11-13

### Added
- Import clients from an Excel (.xlsx) or CSV file (clients list's ⋮ menu): the file's columns are matched to Docky's fields from their headers (every match can be changed), then a preview shows every row as it will be imported - blocking errors in red, warnings in orange, each cell editable, rows can be left out - and the rows kept are created all at once or not at all. Up to 1000 clients per import.
- A client number from the file is kept when it's a number (`867` becomes `C0867`); any other kind goes into the client's note and a number is generated.

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
