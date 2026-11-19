// A company's identity - how its documents look, their default texts and
// conditions are its templates' (shared/models/template.ts).
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
  vat_rate: number;
  vat_number: string | null;
  // Printed in an invoice's footer - free text, optional.
  website: string | null;
  bank_name: string | null;
  bank_account: string | null;
  // An optional QR-IBAN: invoices' QR-bills are then paid to it with a QR
  // reference. Without one, a creditor reference ("RF...") or none.
  qr_iban: string | null;
  payment_reference_type: 'SCOR' | 'NONE';
}
