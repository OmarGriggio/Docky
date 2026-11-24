import { PdfFontFamily } from "../../pdf/core/pdf-fonts";

export const DOCUMENT_LAYOUTS = ["CLASSIC", "MODERN"] as const;
export type DocumentLayout = typeof DOCUMENT_LAYOUTS[number];

// The elements of a PDF a template colors (028_add_template_palette.sql):
// the body text, the document's title (and its underline), the company's
// name in the modern layout's header, the sections' titles, the modern
// layout's table header, the total's band and rules, the early payment
// line, the payment conditions' heading, the payment scale's two rows, a
// quote's "Bon pour accord", the footer (its rule, the company's name, its
// website and email). The Swiss QR-bill is never colored - its guidelines
// fix it black on white.
export const COLOR_ELEMENTS = [
  "text", "title", "companyName", "sectionTitles", "tableHeader", "total", "earlyPayment",
  "conditionsHeading", "scaleEarly", "scaleNet", "approval", "footer",
] as const;
export type ColorElement = typeof COLOR_ELEMENTS[number];

export const MAX_PALETTE = 5;

/** One of a template's colors - named, "#rrggbb". */
export interface PaletteColor {
  name: string;
  color: string;
}

/** Each element's palette color, by its position from 1 - an element left out has none (black, or gray for a band). */
export type ElementColors = Partial<Record<ColorElement, number>>;

// A document template ("Modèle", Paramètres > Modèles - 025_add_templates.sql):
// a quote's, an invoice's and a reminder's look and default texts, several
// per company, one its default. Each quote/invoice picks one
// (documents.template_id).
export interface Template {
  id: number;
  company_id: number;
  name: string;
  is_default: boolean;
  is_active: boolean;

  // The look - read when a draft is printed, frozen on a document once sent
  // (documents.template_style, see TemplateStyle).
  layout: DocumentLayout;
  font: PdfFontFamily;
  // Up to 5 colors, and the one each element of the PDF is printed in - a
  // text's [c1]...[c5] / [f1]...[f5] (pdf/templates/rich-text.ts) are the
  // palette's too.
  palette: PaletteColor[];
  element_colors: ElementColors;
  // "CHF" printed on the total's line - nowhere else (030_add_template_show_currency.sql).
  show_currency: boolean;
  // Only ever set by its own upload route (template.controller.ts).
  header_image: string | null;

  // Copied onto a new document - its own columns are what's printed.
  quote_introduction: string | null;
  quote_conclusion: string | null;
  // A new quote's validity / a new invoice's due date, in days.
  quote_due_days: number | null;
  invoice_introduction: string | null;
  invoice_conclusion: string | null;
  invoice_due_days: number | null;
  payment_terms: string | null;
  // A new invoice's early payment discount: a percentage (0 = none), the
  // days it's offered within (null without one), the total incl. VAT it
  // starts from.
  early_payment_discount: number;
  early_payment_days: number | null;
  early_payment_min_amount: number;

  // A reminder's text, per level (1st, 2nd, formal notice -
  // 034_add_template_reminder_texts.sql) - copied onto the reminder when
  // it's sent (invoice_reminders.text), read as is by a preview. Null or
  // blank: the default text of that level in the client's language
  // (template.defaults.ts).
  reminder_text: string | null;
  reminder_text_2: string | null;
  reminder_text_3: string | null;
}

/** What a request may set - the rest (id, company, default, archived, header image) has its own route. */
export type TemplateData = Omit<Template, "id" | "company_id" | "is_default" | "is_active" | "header_image">;

/**
 * What documents.template_style holds once a document leaves DRAFT: its look,
 * and its template's payment terms then - what a sent quote prints (a quote
 * has none of its own). Missing from a look frozen before they were added.
 */
export type FrozenTemplateStyle = Partial<TemplateStyle> & { payment_terms?: string | null };

/** A document's look - its template's, or what it was frozen with once sent (documents.template_style). */
export interface TemplateStyle {
  layout: DocumentLayout;
  font: PdfFontFamily;
  palette: PaletteColor[];
  element_colors: ElementColors;
  show_currency: boolean;
  header_image: string | null;
}
