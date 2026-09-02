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
