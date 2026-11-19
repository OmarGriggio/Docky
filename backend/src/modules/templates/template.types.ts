import { PdfFontFamily } from "../../pdf/core/pdf-fonts";

export const DOCUMENT_LAYOUTS = ["CLASSIC", "MODERN"] as const;
export type DocumentLayout = typeof DOCUMENT_LAYOUTS[number];

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
  // "#rrggbb" or null: the main color (the total's band, the footer...) and
  // the secondary one (the titles) - also what a text's [c1]/[f1] and
  // [c2]/[f2] print in (pdf/templates/rich-text.ts).
  accent_color: string | null;
  secondary_color: string | null;
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

  // Read every time a reminder is printed - null or blank: the default text
  // in the client's language (template.defaults.ts).
  reminder_text: string | null;
}

/** What a request may set - the rest (id, company, default, archived, header image) has its own route. */
export type TemplateData = Omit<Template, "id" | "company_id" | "is_default" | "is_active" | "header_image">;

/** A document's look - its template's, or what it was frozen with once sent (documents.template_style). */
export interface TemplateStyle {
  layout: DocumentLayout;
  font: PdfFontFamily;
  accent_color: string | null;
  secondary_color: string | null;
  header_image: string | null;
}
