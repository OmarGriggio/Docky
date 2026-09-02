---

# 🏢 Company

Represents a client company using the application.

All data (clients, suppliers, invoices, materials, etc.) belongs to a company.

## Fields

- id
- name
- address
- email
- phone
- VAT number *(optional)*
- logo *(optional)*
- creation date
- status *(active | suspended)*

## Relations

- has several users
- has several clients
- has several suppliers
- has several materials
- has several material prices
- has several employee categories
- has several invoices

---

# 👤 User

Represents a person using the application.

A user belongs to a single company.

## Fields

- id
- company
- first name
- last name
- email
- password (hashed)
- role *(employee | administrator)*
- phone *(optional)*
- creation date
- last login

## Relations

- belongs to a company

---

# 🏢 Supplier

Represents a company supplying materials.

Each supplier belongs to a company.

## Fields

- id
- company
- supplier code
- name
- address
- category

## Relations

- belongs to a company
- has several material prices

---

# 📦 Material

Represents a product or material that can be used in an invoice.

Each material belongs to a company.

## Fields

- id
- company
- material reference
- label
- unit *(piece, kg, m, etc.)*

## Relations

- belongs to a company
- has several supplier prices

---

# 💰 Material price

Links a supplier to a material with its price.

## Fields

- id
- company
- supplier
- material
- price
- default price *(boolean)*
- discount
- delivery time

## Relations

- belongs to a company
- belongs to a supplier
- belongs to a material
- can be used in several invoice lines

---

# 👤 Client

Represents a company's client.

## Fields

- id
- company
- client code
- last name
- first name
- company name
- email
- phone

## Relations

- belongs to a company
- has several invoices

---

# 🧾 Invoice

Represents an invoice issued to a client.

## Fields

- id
- company
- client
- invoice number
- date
- amount excl. VAT
- amount incl. VAT
- discount
- status

## Relations

- belongs to a company
- belongs to a client
- has several invoice lines

---

# 📄 Invoice line

Represents a line of an invoice. A line can correspond to a material or a labor entry.

## Fields

- id
- invoice
- material price *(optional)*
- employee category *(optional)*
- position
- material reference
- material label
- material quantity
- material price
- employee label
- employee time
- employee rate

## Relations

- belongs to an invoice
- can reference a material price
- can reference an employee category

---

# 👷 Employee category

Defines the different types of employees and their hourly rate.

## Fields

- id
- company
- code
- label
- hourly rate

## Relations

- belongs to a company
- can be used in several invoice lines
