# Data Definition

The entities Docky stores, their fields and how they relate. Mirrors the actual schema - [zz_migrations/000_base.sql](../zz_migrations/000_base.sql) plus the numbered migrations after it - described here in business terms. Rewritten 2026-10-22: the original version described the first draft of the model (suppliers, material prices, employee categories, a separate invoice table), most of which was later dropped or merged - see [Decisions.md](Decisions.md).

Conventions that apply to almost every table:

- **`company_id`** - the tenant boundary. Every business record belongs to exactly one company, and every query touching one by id is scoped by it. Only `project_types` is global.
- **`is_active`** - archive instead of delete: business records are hidden, never removed (see [Decisions.md](Decisions.md)).

---

# 🏢 Company

A construction company using Docky - the tenant everything else belongs to.

## Fields

- name, email, phone
- address *(street, postal code, city, country)*
- IBAN - printed on the Swiss QR-bill of every invoice
- VAT number *(optional)*, default VAT rate *(8.1% by default, copied onto each new document)*
- default payment terms *(free text, printed on invoices and quotes)*
- logo, invoice header image *(optional, stored in MinIO/S3)*

## Relations

- has several users, clients, resources, documents, projects
- has one document template per document type at most

---

# 👤 User

A person logging into Docky. Belongs to a single company.

## Fields

- first name, last name, email *(unique)*, password *(bcrypt hash)*
- role *(`ADMIN` - a company's admin | `USER` - an employee | `PLATFORM_ADMIN` - manages the whole SaaS)*
- UI language *(`FR` | `EN`)*
- creation date, last login, active flag

## Relations

- belongs to a company
- has refresh tokens *(one per session, stored as a hash so they can be revoked)*
- appears in the login history *(every login attempt, successful or not)*

---

# 👥 Client

A company's own customer - a private individual or a business.

## Fields

- client number *(unique)*
- type *(`INDIVIDUAL` | `PROFESSIONAL`)*
- first name, last name *(an individual)* or company name and VAT number *(a professional)*
- title *(the greeting printed on documents, e.g. "Monsieur", "Dear Sir/Madam")*
- email, phone, note
- language *(`FR` | `EN` | `DE` | `IT`)* - the language its quotes, invoices and reminders are printed in (FR/EN labels only so far, DE/IT fall back to French)
- placeholder flag - each company has exactly one **"Non défini"** client: what a document made out to a recipient typed by hand points at. Fixed (greeting "Madame, Monsieur", language FR), hidden from the clients list

## Relations

- belongs to a company
- has several addresses, at most one of them primary *(the billing address)*
- has several documents and projects

---

# 📍 Address

One of a client's addresses - billing address or a job site.

## Fields

- attention *(optional "to the attention of")*
- street, postal code, city, country
- primary flag

## Relations

- belongs to a client
- can be picked as a document's job site ("Lieu/Bâtiment")

---

# 📦 Resource

A catalog item a company sells: a material or a service (labor).

## Fields

- type *(`MATERIAL` | `SERVICE`)*
- code *(unique among the company's active resources)*, name
- unit *(picked from the company's own unit list)*
- selling price, purchase price *(optional)*
- parent resource *(optional, for a composite resource)*

## Relations

- belongs to a company
- can be referenced by document lines *(a line keeps its own copy of the label and price, so editing the catalog never rewrites an existing document)*

---

# 📏 Resource unit

The units a company offers for its resources (m², h, kg...). Unique label per company.

---

# 🧾 Document

A quote, an invoice, or a project's own resource ledger - one table for all three, since they share the same shape (a client, sections, lines, totals).

## Fields

- type *(`QUOTE` | `INVOICE` | `PROJECT`)*
- number - server-generated, `OFF-2026-0001` / `FAC-2026-0001` / `CH-2026-0001`, unique per company
- date, due date *(an invoice's due date, a quote's "valid until")*
- client, job site address *(optional)*, client reference *(optional)*
- status *(quotes and invoices only)*:
  - quote: `DRAFT` → `SENT` → `ACCEPTED` (creates a project) or `REJECTED`
  - invoice: `DRAFT` → `SENT` → `PAID` or `CANCELLED`
  - only `DRAFT`/`SENT` documents can still be edited
- discount *(% on the whole document)*, VAT rate *(one rate per document)*
- amount excl. VAT, amount incl. VAT - always computed from the lines, never typed in
- introduction, conclusion, payment terms *(free text printed on the PDF, with `{{placeholders}}`)*
- parent document - what it was derived from: a project's own accepted quote, or an invoice's project
- recipient *(only when made out to "Non défini")* - name, complement, street, postcode, town typed by hand, printed instead of a client's own name and address (country: Switzerland)

## Relations

- belongs to a company and a client
- has several sections, each with several lines
- an accepted quote has one project; a completed project is invoiced at most once *(unless that invoice is cancelled)*

---

# 🗂️ Document section

A titled group of lines within a document ("Matériel", "Main d'œuvre", "Salle de bain"...), in order.

## Fields

- position, title, description
- start/end date *(a project's sections are scheduled on the calendar)*, note

---

# 📄 Document line

One priced line of a section.

## Fields

- type *(`MATERIAL` | `SERVICE`)*
- position *(within its section)*
- label, quantity, unit, unit price, discount *(%)*
- resource *(optional - the catalog item it came from)*

---

# 📝 Document template

A company's default introduction, conclusion and due-date delay for one document type (`QUOTE`, `INVOICE`, or `REMINDER` - the payment reminder's text). Copied into each new document; nothing reads it afterwards except the reminder PDF.

---

# 🏗️ Project ("chantier")

A job carried out for a client - born from an accepted quote, or created by hand.

## Fields

- name, note
- type *(a global `project_types` label: Kitchens, Roofing...)*
- status *(`IN_PROGRESS` | `COMPLETED` - completing it locks its resources and unlocks invoicing)*
- creation date

## Relations

- belongs to a company and a client
- has exactly one `PROJECT` document - its resource ledger, sections scheduled on the calendar
- has several attachments *(files stored in MinIO/S3)*

---

# 📅 Calendar note

A free-standing entry on the company's calendar (title, description, start/end), not tied to a project.
