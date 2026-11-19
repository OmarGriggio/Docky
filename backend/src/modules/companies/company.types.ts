// A company's identity - how its documents look and their default texts and
// conditions are its templates' (modules/templates, 025_add_templates.sql).
export interface Company {
  id: number;

  name: string | null;
  email: string | null;
  phone: string | null;
  iban: string | null;
  street: string | null;
  postal_code: string | null;
  city: string | null;
  country: string | null;
  logo: string | null;
  // Default VAT rate for a new document (document.types.ts's own vat_rate
  // is the one actually used in calculations/PDFs - this is only its
  // starting value).
  vat_rate: number;
  // The company's own VAT/UID number - null if not VAT-registered.
  vat_number: string | null;
  // Printed in an invoice's footer (see backend/src/pdf) - free text, optional.
  website: string | null;
  bank_name: string | null;
  bank_account: string | null;
  // An optional QR-IBAN: invoices' QR-bills are then paid to it with a QR
  // reference (020_add_payment_reference.sql, see payment-reference.ts).
  qr_iban: string | null;
  // Without a QR-IBAN: a creditor reference ("RF...") on invoices' QR-bills,
  // or none.
  payment_reference_type: "SCOR" | "NONE";
}
