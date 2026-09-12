# 1 - Project definition

## 1.1 - Project goal

### What problem does the application solve?

Many small and medium construction businesses still produce their quotes and invoices using Excel files or complex software that is often expensive and hard to use. Managing materials, suppliers and prices is often scattered across tools, which leads to mistakes, wasted time and poor tracking.

The goal of this application is to offer a **simple, intuitive SaaS** that lets construction companies centralize the management of their clients, suppliers, materials and invoices.

The application must allow:

- managing clients;
- managing suppliers;
- managing a catalog of materials;
- recording supplier pricing;
- quickly creating invoices;
- adding materials and labor to invoices;
- keeping a history of invoices.

---

# 2 - Users

## 2.1 - Employee

The employee is a user belonging to a company that uses the application.

Depending on the permissions they're granted, they can view or edit the company's data.

### Features

- Log in to the application
- View clients
- Add and edit clients
- View suppliers
- Manage materials
- Manage supplier pricing
- Create invoices
- Edit invoices
- Print or export invoices

---

## 2.2 - Company administrator

The company administrator is responsible for managing their company's workspace.

They have full rights over their company's data.

### Features

- Manage employees
- Set their access permissions
- Manage clients
- Manage suppliers
- Manage materials
- Manage employee categories
- Manage hourly rates
- Create, edit and delete invoices
- View invoice history
- Configure the company's information

---

## 2.3 - Platform administrator

The platform administrator is responsible for the SaaS running smoothly.

They only handle the technical and administrative aspects of the platform.

### Features

- Manage companies
- Manage subscriptions
- Manage users
- Deactivate a company
- View platform statistics
- Manage global settings

---

# 3 - User roles

| Role | Description |
|------|-------------|
| **Employee** | Uses the application to manage clients, suppliers and invoices. |
| **Company administrator** | Administers all of their company's data and users. |
| **Platform administrator** | Manages the SaaS and its client companies. |

---

# 4 - User journeys

## 4.1 - Employee journey

1. Logs in to the application.
2. Views the list of clients.
3. Selects an existing client or creates a new one.
4. Creates a new invoice.
5. Adds materials.
6. Adds labor hours.
7. Checks the computed amounts.
8. Saves the invoice.
9. Prints or exports the invoice as a PDF.

---

## 4.2 - Company administrator journey

1. Creates their company's account.
2. Configures the company's information.
3. Adds employees.
4. Configures employee categories and hourly rates.
5. Adds suppliers.
6. Enters materials and their pricing.
7. Manages clients.
8. Tracks invoices created by the company.

---

## 4.3 - Platform administrator journey

1. Accesses the admin panel.
2. Views the list of companies.
3. Manages subscriptions.
4. Manages user accounts.
5. Views global statistics.
6. Steps in for technical or administrative issues.

---

## 4.4 - Quote → chantier → invoice lifecycle

The core workflow the application is built around, assuming the company's catalog (materials, services, prices) already exists. This is the authoritative description of the intended order of things - implementation should follow it, not the other way around.

1. **Quote.** The employee drafts a quote for a client (this is also where they sketch the work's general plan - which materials/services, roughly how much of each). A quote never has a chantier attached: at this stage nothing has been built yet for there to be a chantier *of*.
2. **Send.** Once the quote looks right, it's printed to PDF and sent to the client.
3. **Client's answer** decides what happens next, and only one of these:
   - **Refused** → the quote's status becomes REJECTED. Nothing else happens - no chantier, no follow-up.
   - **Accepted** → the quote's status becomes ACCEPTED, and *this is the exact moment a chantier is created* from it. The chantier starts from the quote's own resources/quantities, and this is when the employee moves on to more detailed, on-site planning.
4. **Chantier.** Work happens. Real quantities almost never match what was quoted (more hours, more material) - the employee corrects the chantier's own resource quantities as reality unfolds. The original quote is never edited to reflect this: it stays a frozen record of what was proposed, the chantier is the live record of what's actually happening.
5. **Close.** Once the work is done, the employee closes the chantier - this locks in its final quantities.
6. **Invoice.** From a closed chantier, the employee creates the invoice - billed on the chantier's real, final quantities, not the original quote's.
7. **No-quote shortcut.** Not every job needs a quote first. An invoice can always be created directly, with neither a quote nor a chantier behind it, when going through the full process isn't worth it.

A chantier only ever exists because a quote was accepted - there is no other way to create one, and duplicating a chantier directly (independent of a quote) isn't a supported action either. An invoice, on the other hand, can exist with no chantier and no quote at all.

**Known gaps against this journey** (as of 2026-09-12): step 3's REJECTED/ACCEPTED split and step 2's SENT status aren't wired up yet as distinct actions - today a single "Valider l'offre" button on the quote's detail page jumps straight from DRAFT to ACCEPTED-with-a-new-chantier, with no explicit send/reject step in between. Step 6's "create the invoice from the chantier" is also reversed in the current UI: the employee goes to the invoice form and picks a (closed) chantier from a dropdown, rather than starting from the chantier itself and landing in a pre-filled invoice.
