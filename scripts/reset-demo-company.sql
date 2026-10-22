-- Resets company 2 (Rénov Alpes Sàrl, the demo company handed to recruiters)
-- back to its original seed state - deletes everything it owns and
-- re-inserts the exact same rows zz_migrations/001_data.sql created for it.
-- Meant to run weekly via cron (see scripts/reset-demo-cron.sh and
-- CLAUDE.md's Deployment section) so a demo user's edits never pile up.
--
-- Company 1 (the developer's own company) is never touched. Company 2's own
-- companies row and its users are kept (login stays stable) but put back to
-- their seed values - a demo visitor can edit the company's name, IBAN,
-- logo... and would otherwise break every later visitor's PDFs. The files
-- themselves (logo, header image, project attachments) live in MinIO, not
-- here - scripts/reset-demo-cron.sh purges them right after this script.
--
-- Content is English here (see 001_data.sql's own header comment) - a
-- recruiter is far more likely to read English than French.
--
-- Explicit ids: every table here (except project_types, see below) shares
-- its id sequence across both companies, and insertion order in
-- 001_data.sql fixed company 2's ids once and for all (e.g. clients 6-10,
-- documents 22-41 - see the comment at the top of that file). Re-inserting
-- with those same explicit ids after deleting them is always safe: a SERIAL
-- sequence only ever moves forward, so it can never collide with - or need
-- adjusting for - an id range it already handed out and this script just
-- freed again.
--
-- project_types is the one exception - it's a *global* lookup table (no
-- company_id, shared by every tenant), never deleted/recreated by this
-- script, so its ids aren't fixed the same way: a real user of either
-- company could have added a custom type by hand since this was first
-- seeded, shifting what id a label like 'Roofing' actually has. Looked up
-- by label via a subquery below instead of a literal id, so this stays
-- correct regardless.
--
-- Dates are CURRENT_DATE-relative, same as 001_data.sql, so every reset
-- naturally re-centers the demo chantiers/invoices around "today" again.

-- parent_document_id is a self-reference within company 2's own documents -
-- break it before deleting so no row ever points at an already-deleted one.
UPDATE documents SET parent_document_id = NULL WHERE company_id = 2;

DELETE FROM project_attachments WHERE company_id = 2;
DELETE FROM projects WHERE company_id = 2;
DELETE FROM documents WHERE company_id = 2; -- cascades its own sections/lines
DELETE FROM addresses WHERE company_id = 2;
DELETE FROM clients WHERE company_id = 2;
DELETE FROM resources WHERE company_id = 2;
DELETE FROM resource_units WHERE company_id = 2;
DELETE FROM document_templates WHERE company_id = 2;
DELETE FROM calendar_notes WHERE company_id = 2;

-- ==========================================
-- COMPANY AND USERS
-- ==========================================

-- Same values as 001_data.sql's own row for company 2.
UPDATE companies SET
    name = 'Rénov Alpes Sàrl',
    email = 'contact@renovalpes.ch',
    phone = '+41798765432',
    iban = 'CH9300762011623852957',
    street = 'Avenue de la Gare 22',
    postal_code = '1950',
    city = 'Sion',
    country = 'Switzerland',
    logo = NULL,
    header_image = NULL,
    vat_rate = 8.1,
    vat_number = 'CHE-321.654.987 VAT',
    payment_terms = 'Payment due within 30 days net, no discount.
A late payment interest of 5% per annum will be charged on overdue payments.'
WHERE id = 2;

-- Same as 004_set_demo_company_language.sql.
UPDATE users SET language = 'EN' WHERE company_id = 2;

-- ==========================================
-- CLIENTS
-- ==========================================

-- language isn't set inline here - the reset script's own UPDATE below
-- (mirroring 004_set_demo_company_language.sql) flips it to 'EN' right after,
-- same reasoning as the clients created by 001_data.sql.
INSERT INTO clients
(id, company_id, client_number, type, company_name, vat_number, last_name, first_name, title, email, phone, note, is_active)
VALUES
(6, 2, 'C0006', 'INDIVIDUAL', NULL, NULL, 'Fournier', 'Marc', 'Mr', 'marc.fournier@gmail.com', '0764445566', NULL, TRUE),
(7, 2, 'C0007', 'INDIVIDUAL', NULL, NULL, 'Bianchi', 'Elena', 'Ms', 'elena.bianchi@gmail.com', '0765556677', NULL, TRUE),
(8, 2, 'C0008', 'PROFESSIONAL', 'Hôtel du Cervin SA', 'CHE-111.222.333', NULL, NULL, 'Dear Sir/Madam', 'contact@hotelducervin.ch', '0276667788', 'Professional client', TRUE),
(9, 2, 'C0009', 'PROFESSIONAL', 'Immobilière Valaisanne Sàrl', 'CHE-444.555.666', NULL, NULL, 'Dear Sir/Madam', 'info@immo-valais.ch', '0278889900', 'Professional client', TRUE),
(10, 2, 'C0010', 'INDIVIDUAL', NULL, NULL, 'Roduit', 'Claire', 'Ms', 'claire.roduit@gmail.com', '0767778899', NULL, TRUE);

UPDATE clients SET language = 'EN' WHERE company_id = 2;

-- ==========================================
-- ADDRESSES
-- ==========================================

INSERT INTO addresses
(id, company_id, client_id, is_primary, attention, street, postal_code, city, country)
VALUES
(6, 2, 6, TRUE, NULL, 'Rue du Rhône 14', '1950', 'Sion', 'Switzerland'),
(7, 2, 7, TRUE, NULL, 'Route de Riddes 8', '1908', 'Riddes', 'Switzerland'),
(8, 2, 8, TRUE, NULL, 'Rue du Cervin 3', '3920', 'Zermatt', 'Switzerland'),
(9, 2, 9, TRUE, NULL, 'Avenue de la Gare 40', '1950', 'Sion', 'Switzerland'),
(10, 2, 10, TRUE, NULL, 'Chemin des Vignes 6', '1963', 'Vétroz', 'Switzerland');

-- ==========================================
-- RESOURCES
-- ==========================================

INSERT INTO resources
(id, company_id, parent_resource_id, type, code, name, unit, selling_price, purchase_price, is_active)
VALUES
(21, 2, NULL, 'MATERIAL', 'MAT101', 'Clay roof tile', 'Each', 3.2, 1.8, TRUE),
(22, 2, NULL, 'MATERIAL', 'MAT102', 'Rock wool insulation 100mm', 'm²', 18.5, 12, TRUE),
(23, 2, NULL, 'MATERIAL', 'MAT103', 'Triple-glazed PVC window', 'Each', 650, 420, TRUE),
(24, 2, NULL, 'MATERIAL', 'MAT104', 'Zinc gutter', 'm', 38, 24, TRUE),
(25, 2, NULL, 'MATERIAL', 'MAT105', 'Roof dormer window', 'Each', 1450, 980, TRUE),
(26, 2, NULL, 'SERVICE', 'MO101', 'Qualified roofer', 'Hour', 105, NULL, TRUE),
(27, 2, NULL, 'SERVICE', 'MO102', 'Roofing apprentice', 'Hour', 58, NULL, TRUE),
(28, 2, NULL, 'SERVICE', 'ST101', 'External crane operator', 'Hour', 140, 100, TRUE),
(29, 2, NULL, 'SERVICE', 'DIV101', 'Travel', 'Flat rate', 65, NULL, TRUE),
(30, 2, NULL, 'SERVICE', 'DIV102', 'Scaffolding rental', 'Week', 320, 220, TRUE);

-- ==========================================
-- RESOURCE UNITS
-- ==========================================

INSERT INTO resource_units (id, company_id, label)
VALUES
(11, 2, 'Hour'),
(12, 2, 'Day'),
(13, 2, 'Week'),
(14, 2, 'Flat rate'),
(15, 2, 'Each'),
(16, 2, 'Bag'),
(17, 2, 'Can'),
(18, 2, 'm'),
(19, 2, 'm²'),
(20, 2, 'kg');

-- ==========================================
-- DOCUMENT TEMPLATES
-- ==========================================

INSERT INTO document_templates
(id, company_id, type, introduction, conclusion, due_days)
VALUES
(3, 2, 'INVOICE', '{{titre_client}},

We are pleased to send you the invoice below, issued in accordance with our agreement. Please do not hesitate to contact us with any questions.', 'Thank you for your trust. Kind regards,

{{signature_entreprise}}', 30),
(4, 2, 'QUOTE', '{{titre_client}},

We are pleased to submit our quote for the work described below.', 'This quote is valid for 30 days from its issue date. Please do not hesitate to contact us with any questions.

Kind regards,

{{signature_entreprise}}', 30);

-- ==========================================
-- DOCUMENTS
-- ==========================================

INSERT INTO documents
(id, company_id, client_id, address_id, reference_client, parent_document_id, type, number, date, amount_excl_vat, amount_incl_vat, discount, vat_rate, status, introduction, conclusion, payment_terms, due_date, is_active)
VALUES
(22, 2, 8, NULL, NULL, NULL, 'QUOTE', 'OFF-2026-0001', CURRENT_DATE - 90, 2540, 2745.74, 0, 8.1, 'ACCEPTED', '{{titre_client}},

We are pleased to submit our quote for the work described below.', 'This quote is valid for 30 days from its issue date. Please do not hesitate to contact us with any questions.

Kind regards,

{{signature_entreprise}}', 'Payment due within 30 days net, no discount.
A late payment interest of 5% per annum will be charged on overdue payments.', CURRENT_DATE - 60, TRUE),
(23, 2, 9, NULL, NULL, NULL, 'QUOTE', 'OFF-2026-0002', CURRENT_DATE - 70, 6635.75, 7173.25, 5, 8.1, 'ACCEPTED', '{{titre_client}},

We are pleased to submit our quote for the work described below.', 'This quote is valid for 30 days from its issue date. Please do not hesitate to contact us with any questions.

Kind regards,

{{signature_entreprise}}', 'Payment due within 30 days net, no discount.
A late payment interest of 5% per annum will be charged on overdue payments.', CURRENT_DATE - 40, TRUE),
(24, 2, 10, NULL, NULL, NULL, 'QUOTE', 'OFF-2026-0003', CURRENT_DATE - 65, 1597, 1726.36, 0, 8.1, 'ACCEPTED', '{{titre_client}},

We are pleased to submit our quote for the work described below.', 'This quote is valid for 30 days from its issue date. Please do not hesitate to contact us with any questions.

Kind regards,

{{signature_entreprise}}', 'Payment due within 30 days net, no discount.
A late payment interest of 5% per annum will be charged on overdue payments.', CURRENT_DATE - 35, TRUE),
(25, 2, 7, NULL, NULL, NULL, 'QUOTE', 'OFF-2026-0004', CURRENT_DATE - 30, 2179, 2355.5, 0, 8.1, 'ACCEPTED', '{{titre_client}},

We are pleased to submit our quote for the work described below.', 'This quote is valid for 30 days from its issue date. Please do not hesitate to contact us with any questions.

Kind regards,

{{signature_entreprise}}', 'Payment due within 30 days net, no discount.
A late payment interest of 5% per annum will be charged on overdue payments.', CURRENT_DATE, TRUE),
(26, 2, 6, NULL, NULL, NULL, 'QUOTE', 'OFF-2026-0005', CURRENT_DATE - 20, 2645, 2859.25, 0, 8.1, 'ACCEPTED', '{{titre_client}},

We are pleased to submit our quote for the work described below.', 'This quote is valid for 30 days from its issue date. Please do not hesitate to contact us with any questions.

Kind regards,

{{signature_entreprise}}', 'Payment due within 30 days net, no discount.
A late payment interest of 5% per annum will be charged on overdue payments.', CURRENT_DATE + 10, TRUE),
(27, 2, 8, NULL, NULL, NULL, 'QUOTE', 'OFF-2026-0006', CURRENT_DATE - 6, 12660, 13685.46, 0, 8.1, 'SENT', '{{titre_client}},

We are pleased to submit our quote for the work described below.', 'This quote is valid for 30 days from its issue date. Please do not hesitate to contact us with any questions.

Kind regards,

{{signature_entreprise}}', 'Payment due within 30 days net, no discount.
A late payment interest of 5% per annum will be charged on overdue payments.', CURRENT_DATE + 24, TRUE),
(28, 2, 9, NULL, NULL, NULL, 'QUOTE', 'OFF-2026-0007', CURRENT_DATE - 2, 6760, 7307.56, 0, 8.1, 'DRAFT', '{{titre_client}},

We are pleased to submit our quote for the work described below.', 'This quote is valid for 30 days from its issue date. Please do not hesitate to contact us with any questions.

Kind regards,

{{signature_entreprise}}', 'Payment due within 30 days net, no discount.
A late payment interest of 5% per annum will be charged on overdue payments.', CURRENT_DATE + 28, TRUE),
(29, 2, 10, NULL, NULL, NULL, 'QUOTE', 'OFF-2026-0008', CURRENT_DATE - 50, 824, 890.74, 0, 8.1, 'REJECTED', '{{titre_client}},

We are pleased to submit our quote for the work described below.', 'This quote is valid for 30 days from its issue date. Please do not hesitate to contact us with any questions.

Kind regards,

{{signature_entreprise}}', 'Payment due within 30 days net, no discount.
A late payment interest of 5% per annum will be charged on overdue payments.', CURRENT_DATE - 20, FALSE),
(30, 2, 8, NULL, NULL, 22, 'PROJECT', 'CH-2026-0001', CURRENT_DATE - 88, 2572, 2572, 0, 0, NULL, NULL, NULL, NULL, NULL, TRUE),
(31, 2, 9, NULL, NULL, 23, 'PROJECT', 'CH-2026-0002', CURRENT_DATE - 68, 6985, 6985, 0, 0, NULL, NULL, NULL, NULL, NULL, TRUE),
(32, 2, 10, NULL, NULL, 24, 'PROJECT', 'CH-2026-0003', CURRENT_DATE - 63, 1597, 1597, 0, 0, NULL, NULL, NULL, NULL, NULL, TRUE),
(33, 2, 6, NULL, NULL, NULL, 'PROJECT', 'CH-2026-0004', CURRENT_DATE - 60, 905, 905, 0, 0, NULL, NULL, NULL, NULL, NULL, TRUE),
(34, 2, 7, NULL, NULL, 25, 'PROJECT', 'CH-2026-0005', CURRENT_DATE - 28, 2179, 2179, 0, 0, NULL, NULL, NULL, NULL, NULL, TRUE),
(35, 2, 6, NULL, NULL, 26, 'PROJECT', 'CH-2026-0006', CURRENT_DATE - 18, 2645, 2645, 0, 0, NULL, NULL, NULL, NULL, NULL, TRUE),
(36, 2, 8, NULL, NULL, 30, 'INVOICE', 'FAC-2026-0001', CURRENT_DATE - 2, 2572, 2780.33, 0, 8.1, 'PAID', '{{titre_client}},

We are pleased to send you the invoice below, issued in accordance with our agreement. Please do not hesitate to contact us with any questions.', 'Thank you for your trust. Kind regards,

{{signature_entreprise}}', 'Payment due within 30 days net, no discount.
A late payment interest of 5% per annum will be charged on overdue payments.', CURRENT_DATE + 28, TRUE),
(37, 2, 9, NULL, NULL, 31, 'INVOICE', 'FAC-2026-0002', CURRENT_DATE - 46, 6635.75, 7173.25, 5, 8.1, 'PAID', '{{titre_client}},

We are pleased to send you the invoice below, issued in accordance with our agreement. Please do not hesitate to contact us with any questions.', 'Thank you for your trust. Kind regards,

{{signature_entreprise}}', 'Payment due within 30 days net, no discount.
A late payment interest of 5% per annum will be charged on overdue payments.', CURRENT_DATE - 16, TRUE),
(38, 2, 10, NULL, NULL, 32, 'INVOICE', 'FAC-2026-0003', CURRENT_DATE - 55, 1597, 1726.36, 0, 8.1, 'SENT', '{{titre_client}},

We are pleased to send you the invoice below, issued in accordance with our agreement. Please do not hesitate to contact us with any questions.', 'Thank you for your trust. Kind regards,

{{signature_entreprise}}', 'Payment due within 30 days net, no discount.
A late payment interest of 5% per annum will be charged on overdue payments.', CURRENT_DATE - 25, TRUE),
(39, 2, 7, NULL, 'Order 2026-118', NULL, 'INVOICE', 'FAC-2026-0004', CURRENT_DATE - 1, 695, 751.3, 0, 8.1, 'DRAFT', '{{titre_client}},

We are pleased to send you the invoice below, issued in accordance with our agreement. Please do not hesitate to contact us with any questions.', 'Thank you for your trust. Kind regards,

{{signature_entreprise}}', 'Payment due within 30 days net, no discount.
A late payment interest of 5% per annum will be charged on overdue payments.', CURRENT_DATE + 29, TRUE),
(40, 2, 6, NULL, NULL, NULL, 'INVOICE', 'FAC-2026-0005', CURRENT_DATE - 40, 239, 258.36, 0, 8.1, 'CANCELLED', '{{titre_client}},

We are pleased to send you the invoice below, issued in accordance with our agreement. Please do not hesitate to contact us with any questions.', 'Thank you for your trust. Kind regards,

{{signature_entreprise}}', 'Payment due within 30 days net, no discount.
A late payment interest of 5% per annum will be charged on overdue payments.', CURRENT_DATE - 10, TRUE),
(41, 2, 8, NULL, NULL, NULL, 'INVOICE', 'FAC-2026-0006', CURRENT_DATE - 5, 485, 524.29, 0, 8.1, 'SENT', '{{titre_client}},

We are pleased to send you the invoice below, issued in accordance with our agreement. Please do not hesitate to contact us with any questions.', 'Thank you for your trust. Kind regards,

{{signature_entreprise}}', 'Payment due within 30 days net, no discount.
A late payment interest of 5% per annum will be charged on overdue payments.', CURRENT_DATE + 25, TRUE);

-- ==========================================
-- DOCUMENT SECTIONS
-- ==========================================

INSERT INTO document_sections
(id, company_id, document_id, position, title, description, date_start, date_end, is_active)
VALUES
(24, 2, 22, 1, 'Roof refurbishment', NULL, NULL, NULL, TRUE),
(25, 2, 23, 1, 'Insulation and windows', NULL, NULL, NULL, TRUE),
(26, 2, 24, 1, 'Window replacement', NULL, NULL, NULL, TRUE),
(27, 2, 25, 1, 'Gutters and downpipes', NULL, NULL, NULL, TRUE),
(28, 2, 26, 1, 'Attic insulation', NULL, NULL, NULL, TRUE),
(29, 2, 27, 1, 'Dormer windows', NULL, NULL, NULL, TRUE),
(30, 2, 27, 2, 'Windows', NULL, NULL, NULL, TRUE),
(31, 2, 27, 3, 'Logistics', NULL, NULL, NULL, TRUE),
(32, 2, 28, 1, 'Roof refurbishment', NULL, NULL, NULL, TRUE),
(33, 2, 29, 1, 'Roof window', NULL, NULL, NULL, FALSE),
(34, 2, 30, 1, 'Roof refurbishment', NULL, CURRENT_DATE - 3 + TIME '07:00', CURRENT_DATE - 3 + TIME '17:00', TRUE),
(35, 2, 31, 1, 'Insulation and windows', NULL, CURRENT_DATE - 50 + TIME '07:00', CURRENT_DATE - 50 + TIME '17:00', TRUE),
(36, 2, 32, 1, 'Window replacement', NULL, CURRENT_DATE - 60 + TIME '08:00', CURRENT_DATE - 60 + TIME '17:00', TRUE),
(37, 2, 33, 1, 'Maintenance', NULL, CURRENT_DATE - 2 + TIME '07:00', CURRENT_DATE - 2 + TIME '16:00', TRUE),
(38, 2, 34, 1, 'Gutters and downpipes', NULL, CURRENT_DATE + 1 + TIME '07:00', CURRENT_DATE + 1 + TIME '17:00', TRUE),
(39, 2, 35, 1, 'Attic insulation', NULL, NULL, NULL, TRUE),
(40, 2, 36, 1, 'Roof refurbishment', NULL, NULL, NULL, TRUE),
(41, 2, 37, 1, 'Insulation and windows', NULL, NULL, NULL, TRUE),
(42, 2, 38, 1, 'Window replacement', NULL, NULL, NULL, TRUE),
(43, 2, 39, 1, 'Roof repair', NULL, NULL, NULL, TRUE),
(44, 2, 40, 1, 'Minor works', NULL, NULL, NULL, TRUE),
(45, 2, 41, 1, 'Annual maintenance', NULL, NULL, NULL, TRUE);

-- ==========================================
-- DOCUMENT LINES
-- ==========================================

INSERT INTO document_lines
(id, company_id, document_id, section_id, type, position, label, quantity, unit, unit_price, discount, resource_id, is_active)
VALUES
(54, 2, 22, 24, 'MATERIAL', 1, 'Clay roof tile', 200, 'Each', 3.2, 0, 21, TRUE),
(55, 2, 22, 24, 'SERVICE', 2, 'Qualified roofer', 12, 'Hour', 105, 0, 26, TRUE),
(56, 2, 22, 24, 'SERVICE', 3, 'Scaffolding rental', 2, 'Week', 320, 0, 30, TRUE),
(57, 2, 23, 25, 'MATERIAL', 1, 'Rock wool insulation 100mm', 120, 'm²', 18.5, 0, 22, TRUE),
(58, 2, 23, 25, 'MATERIAL', 2, 'Triple-glazed PVC window', 4, 'Each', 650, 0, 23, TRUE),
(59, 2, 23, 25, 'SERVICE', 3, 'Qualified roofer', 20, 'Hour', 105, 0, 26, TRUE),
(60, 2, 23, 25, 'SERVICE', 4, 'Travel', 1, 'Flat rate', 65, 0, 29, TRUE),
(61, 2, 24, 26, 'MATERIAL', 1, 'Triple-glazed PVC window', 2, 'Each', 650, 0, 23, TRUE),
(62, 2, 24, 26, 'SERVICE', 2, 'Roofing apprentice', 4, 'Hour', 58, 0, 27, TRUE),
(63, 2, 24, 26, 'SERVICE', 3, 'Travel', 1, 'Flat rate', 65, 0, 29, TRUE),
(64, 2, 25, 27, 'MATERIAL', 1, 'Zinc gutter', 28, 'm', 38, 0, 24, TRUE),
(65, 2, 25, 27, 'SERVICE', 2, 'Qualified roofer', 10, 'Hour', 105, 0, 26, TRUE),
(66, 2, 25, 27, 'SERVICE', 3, 'Travel', 1, 'Flat rate', 65, 0, 29, TRUE),
(67, 2, 26, 28, 'MATERIAL', 1, 'Rock wool insulation 100mm', 60, 'm²', 18.5, 0, 22, TRUE),
(68, 2, 26, 28, 'SERVICE', 2, 'Qualified roofer', 14, 'Hour', 105, 0, 26, TRUE),
(69, 2, 26, 28, 'SERVICE', 3, 'Travel', 1, 'Flat rate', 65, 0, 29, TRUE),
(70, 2, 27, 29, 'MATERIAL', 1, 'Roof dormer window', 2, 'Each', 1450, 0, 25, TRUE),
(71, 2, 27, 29, 'SERVICE', 2, 'Qualified roofer', 24, 'Hour', 105, 0, 26, TRUE),
(72, 2, 27, 30, 'MATERIAL', 1, 'Triple-glazed PVC window', 6, 'Each', 650, 0, 23, TRUE),
(73, 2, 27, 30, 'SERVICE', 2, 'Qualified roofer', 12, 'Hour', 105, 0, 26, TRUE),
(74, 2, 27, 31, 'SERVICE', 1, 'External crane operator', 8, 'Hour', 140, 0, 28, TRUE),
(75, 2, 27, 31, 'SERVICE', 2, 'Scaffolding rental', 3, 'Week', 320, 0, 30, TRUE),
(76, 2, 28, 32, 'MATERIAL', 1, 'Clay roof tile', 800, 'Each', 3.2, 0, 21, TRUE),
(77, 2, 28, 32, 'SERVICE', 2, 'Qualified roofer', 40, 'Hour', 105, 0, 26, TRUE),
(78, 2, 29, 33, 'MATERIAL', 1, 'Triple-glazed PVC window', 1, 'Each', 650, 0, 23, FALSE),
(79, 2, 29, 33, 'SERVICE', 2, 'Roofing apprentice', 3, 'Hour', 58, 0, 27, FALSE),
(80, 2, 30, 34, 'MATERIAL', 1, 'Clay roof tile', 210, 'Each', 3.2, 0, 21, TRUE),
(81, 2, 30, 34, 'SERVICE', 2, 'Qualified roofer', 12, 'Hour', 105, 0, 26, TRUE),
(82, 2, 30, 34, 'SERVICE', 3, 'Scaffolding rental', 2, 'Week', 320, 0, 30, TRUE),
(83, 2, 31, 35, 'MATERIAL', 1, 'Rock wool insulation 100mm', 120, 'm²', 18.5, 0, 22, TRUE),
(84, 2, 31, 35, 'MATERIAL', 2, 'Triple-glazed PVC window', 4, 'Each', 650, 0, 23, TRUE),
(85, 2, 31, 35, 'SERVICE', 3, 'Qualified roofer', 20, 'Hour', 105, 0, 26, TRUE),
(86, 2, 31, 35, 'SERVICE', 4, 'Travel', 1, 'Flat rate', 65, 0, 29, TRUE),
(87, 2, 32, 36, 'MATERIAL', 1, 'Triple-glazed PVC window', 2, 'Each', 650, 0, 23, TRUE),
(88, 2, 32, 36, 'SERVICE', 2, 'Roofing apprentice', 4, 'Hour', 58, 0, 27, TRUE),
(89, 2, 32, 36, 'SERVICE', 3, 'Travel', 1, 'Flat rate', 65, 0, 29, TRUE),
(90, 2, 33, 37, 'SERVICE', 1, 'Qualified roofer', 8, 'Hour', 105, 0, 26, TRUE),
(91, 2, 33, 37, 'SERVICE', 2, 'Travel', 1, 'Flat rate', 65, 0, 29, TRUE),
(92, 2, 34, 38, 'MATERIAL', 1, 'Zinc gutter', 28, 'm', 38, 0, 24, TRUE),
(93, 2, 34, 38, 'SERVICE', 2, 'Qualified roofer', 10, 'Hour', 105, 0, 26, TRUE),
(94, 2, 34, 38, 'SERVICE', 3, 'Travel', 1, 'Flat rate', 65, 0, 29, TRUE),
(95, 2, 35, 39, 'MATERIAL', 1, 'Rock wool insulation 100mm', 60, 'm²', 18.5, 0, 22, TRUE),
(96, 2, 35, 39, 'SERVICE', 2, 'Qualified roofer', 14, 'Hour', 105, 0, 26, TRUE),
(97, 2, 35, 39, 'SERVICE', 3, 'Travel', 1, 'Flat rate', 65, 0, 29, TRUE),
(98, 2, 36, 40, 'MATERIAL', 1, 'Clay roof tile', 210, 'Each', 3.2, 0, 21, TRUE),
(99, 2, 36, 40, 'SERVICE', 2, 'Qualified roofer', 12, 'Hour', 105, 0, 26, TRUE),
(100, 2, 36, 40, 'SERVICE', 3, 'Scaffolding rental', 2, 'Week', 320, 0, 30, TRUE),
(101, 2, 37, 41, 'MATERIAL', 1, 'Rock wool insulation 100mm', 120, 'm²', 18.5, 0, 22, TRUE),
(102, 2, 37, 41, 'MATERIAL', 2, 'Triple-glazed PVC window', 4, 'Each', 650, 0, 23, TRUE),
(103, 2, 37, 41, 'SERVICE', 3, 'Qualified roofer', 20, 'Hour', 105, 0, 26, TRUE),
(104, 2, 37, 41, 'SERVICE', 4, 'Travel', 1, 'Flat rate', 65, 0, 29, TRUE),
(105, 2, 38, 42, 'MATERIAL', 1, 'Triple-glazed PVC window', 2, 'Each', 650, 0, 23, TRUE),
(106, 2, 38, 42, 'SERVICE', 2, 'Roofing apprentice', 4, 'Hour', 58, 0, 27, TRUE),
(107, 2, 38, 42, 'SERVICE', 3, 'Travel', 1, 'Flat rate', 65, 0, 29, TRUE),
(108, 2, 39, 43, 'SERVICE', 1, 'Qualified roofer', 6, 'Hour', 105, 0, 26, TRUE),
(109, 2, 39, 43, 'SERVICE', 2, 'Travel', 1, 'Flat rate', 65, 0, 29, TRUE),
(110, 2, 40, 44, 'SERVICE', 1, 'Roofing apprentice', 3, 'Hour', 58, 0, 27, TRUE),
(111, 2, 40, 44, 'SERVICE', 2, 'Travel', 1, 'Flat rate', 65, 0, 29, TRUE),
(112, 2, 41, 45, 'SERVICE', 1, 'Qualified roofer', 4, 'Hour', 105, 0, 26, TRUE),
(113, 2, 41, 45, 'SERVICE', 2, 'Travel', 1, 'Flat rate', 65, 0, 29, TRUE);

-- ==========================================
-- PROJECTS
-- ==========================================

-- project_type_id: looked up by label (see this file's own header comment
-- on why project_types can't use a literal id here).
INSERT INTO projects
(id, company_id, document_id, client_id, project_type_id, name, note, status, is_active)
VALUES
(8, 2, 30, 8, (SELECT id FROM project_types WHERE label = 'Roofing'), 'Hotel roof renovation', NULL, 'COMPLETED', TRUE),
(9, 2, 31, 9, (SELECT id FROM project_types WHERE label = 'Insulation'), 'Building insulation and windows', NULL, 'COMPLETED', TRUE),
(10, 2, 32, 10, (SELECT id FROM project_types WHERE label = 'Windows'), 'Window replacement', NULL, 'COMPLETED', TRUE),
(11, 2, 33, 6, (SELECT id FROM project_types WHERE label = 'Other'), 'Chalet roof maintenance', NULL, 'IN_PROGRESS', TRUE),
(12, 2, 34, 7, (SELECT id FROM project_types WHERE label = 'Roofing'), 'Gutters and downpipes', NULL, 'IN_PROGRESS', TRUE),
(13, 2, 35, 6, (SELECT id FROM project_types WHERE label = 'Insulation'), 'Attic insulation', NULL, 'IN_PROGRESS', TRUE);

-- ==========================================
-- CALENDAR NOTES
-- ==========================================

INSERT INTO calendar_notes
(id, company_id, title, description, date_start, date_end)
VALUES
(3, 2, 'Site visit - Zermatt', 'Hotel roof: survey for the upcoming quote.', (CURRENT_DATE + 2 + TIME '14:00') AT TIME ZONE 'Europe/Zurich', (CURRENT_DATE + 2 + TIME '15:30') AT TIME ZONE 'Europe/Zurich');
