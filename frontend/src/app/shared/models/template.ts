export type DocumentLayout = 'CLASSIC' | 'MODERN';
export type DocumentFont = 'HELVETICA' | 'LATO' | 'PT_SERIF';

// A document template ("Modèle", Paramètres > Modèles - the backend's
// modules/templates): a quote's, an invoice's and a reminder's look and
// default texts and conditions. Several per company, one its default; each
// quote/invoice picks one (Document.template_id).
export interface Template {
  id: number;
  company_id: number;
  name: string;
  is_default: boolean;
  is_active: boolean;

  // The look - a draft prints its template as it is now, a document sent
  // keeps the look it was sent with (Document.template_style).
  layout: DocumentLayout;
  font: DocumentFont;
  // "#rrggbb" or null: the main color (the total's band, the footer...) and
  // the secondary one (the titles) - also what a text's [c1]/[f1] and
  // [c2]/[f2] print in.
  accent_color: string | null;
  secondary_color: string | null;
  // A storage key, set by its own upload route only.
  header_image: string | null;

  // Copied onto a new document.
  quote_introduction: string | null;
  quote_conclusion: string | null;
  quote_due_days: number | null;
  invoice_introduction: string | null;
  invoice_conclusion: string | null;
  invoice_due_days: number | null;
  payment_terms: string | null;
  // A new invoice's early payment discount ("escompte"): rate% off the total
  // incl. VAT when paid within `days`, from `min_amount` incl. VAT up. 0% = none.
  early_payment_discount: number;
  early_payment_days: number | null;
  early_payment_min_amount: number;

  // Every reminder's text - null or blank: the default one in the client's language.
  reminder_text: string | null;
}

/** What a save sends - the default, the archive and the header image have their own requests. */
export type TemplateData = Omit<Template, 'id' | 'company_id' | 'is_default' | 'is_active' | 'header_image'>;

/** A document's look: what it was frozen with once sent. */
export type TemplateStyle = Pick<Template, 'layout' | 'font' | 'accent_color' | 'secondary_color' | 'header_image'>;
