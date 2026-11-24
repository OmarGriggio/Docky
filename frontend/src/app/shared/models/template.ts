export type DocumentLayout = 'CLASSIC' | 'MODERN';
export type DocumentFont = 'HELVETICA' | 'LATO' | 'PT_SERIF';

// The elements of a PDF a template colors (the backend's template.types.ts)
// - the Swiss QR-bill never is, its guidelines fix it black on white.
export const COLOR_ELEMENTS = [
  'text', 'title', 'companyName', 'sectionTitles', 'tableHeader', 'total', 'earlyPayment',
  'conditionsHeading', 'scaleEarly', 'scaleNet', 'approval', 'footer',
] as const;
export type ColorElement = typeof COLOR_ELEMENTS[number];

export const MAX_PALETTE = 5;

/** One of a template's colors - named, "#rrggbb". */
export interface PaletteColor {
  name: string;
  color: string;
}

/** Each element's palette color, by its position from 1 - left out: none (black, or gray for a band). */
export type ElementColors = Partial<Record<ColorElement, number>>;

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
  // Up to 5 colors, and the one each element of the PDF is printed in - a
  // text's [c1]...[c5] / [f1]...[f5] print in the palette's too.
  palette: PaletteColor[];
  element_colors: ElementColors;
  // "CHF" printed on the total's line of its PDFs - nowhere else. Off by default.
  show_currency: boolean;
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

  // A reminder's text per level - the 1st's, the 2nd's, the formal notice's.
  // Null or blank: that level's default text in the client's language.
  reminder_text: string | null;
  reminder_text_2: string | null;
  reminder_text_3: string | null;
}

/** What a save sends - the default, the archive and the header image have their own requests. */
export type TemplateData = Omit<Template, 'id' | 'company_id' | 'is_default' | 'is_active' | 'header_image'>;

/** A document's look: what it was frozen with once sent. */
export type TemplateStyle = Pick<Template, 'layout' | 'font' | 'palette' | 'element_colors' | 'show_currency' | 'header_image'>;
