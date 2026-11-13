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
  // Shown at the very top of a generated invoice (see backend/src/pdf) -
  // distinct from the logo, which stays in its own top-right corner slot.
  header_image: string | null;
  // Default VAT rate for a new document (document.types.ts's own vat_rate
  // is the one actually used in calculations/PDFs - this is only its
  // starting value).
  vat_rate: number;
  // The company's own VAT/UID number - null if not VAT-registered.
  vat_number: string | null;
  // Default payment terms for a new document (documents.payment_terms is
  // the one actually used/shown - this is only its starting value, same
  // "default vs. frozen-per-document" split as vat_rate above). TEXT, not
  // VARCHAR - free text, multi-line.
  payment_terms: string | null;
  // Printed in an invoice's footer (see backend/src/pdf) - free text, optional.
  website: string | null;
  bank_name: string | null;
  bank_account: string | null;
  // Default early payment discount for a new invoice - copied onto it at
  // creation and frozen there (documents' own columns of the same name, see
  // document.service.ts's addDocumentServ). A percentage, 0 = none; days
  // null when there's none; min_amount the total incl. VAT it starts from.
  early_payment_discount: number;
  early_payment_days: number | null;
  early_payment_min_amount: number;
  // "#rrggbb", printed on invoices and quotes (see backend/src/pdf's
  // business-letter.ts) - null for none.
  accent_color: string | null;
  // Same, for what's printed in the second color - null for none.
  secondary_color: string | null;
  // An optional QR-IBAN: invoices' QR-bills are then paid to it with a QR
  // reference (020_add_payment_reference.sql, see payment-reference.ts).
  qr_iban: string | null;
  // Without a QR-IBAN: a creditor reference ("RF...") on invoices' QR-bills,
  // or none.
  payment_reference_type: "SCOR" | "NONE";
}
