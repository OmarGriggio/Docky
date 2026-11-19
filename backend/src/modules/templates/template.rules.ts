// What a template may hold (template.types.ts) - checked on every save,
// pure so it's tested on its own (template.rules.test.ts).

import { isFontFamily } from "../../pdf/core/pdf-fonts";
import { AppError } from "../../shared/types/errors";
import { DOCUMENT_LAYOUTS, Template, TemplateData, TemplateStyle } from "./template.types";

const MAX_AMOUNT = 9999999999.99;
const MAX_TEXT = 10000;
const TEXT_FIELDS = [
  "quote_introduction", "quote_conclusion", "invoice_introduction", "invoice_conclusion", "payment_terms", "reminder_text",
] as const;

const color = (value: unknown, field: string): string | null => {
  if (value === null || value === undefined || value === "") {
    return null;
  }
  if (typeof value !== "string" || !/^#[0-9a-f]{6}$/i.test(value)) {
    throw new AppError(`${field} must be a color like #b8860b`, 400);
  }
  return value.toLowerCase();
};

const text = (value: unknown, field: string): string | null => {
  if (value === null || value === undefined) {
    return null;
  }
  if (typeof value !== "string" || value.length > MAX_TEXT) {
    throw new AppError(`${field} must be a text of ${MAX_TEXT} characters or fewer`, 400);
  }
  return value;
};

const days = (value: unknown, field: string): number | null => {
  if (value === null || value === undefined || value === "") {
    return null;
  }
  const number = Number(value);
  if (!Number.isInteger(number) || number < 0 || number > 3650) {
    throw new AppError(`${field} must be a whole number of days`, 400);
  }
  return number;
};

/**
 * A template's settings as stored: a name (1-100 characters), known layout
 * and font (anything else the defaults), colors as "#rrggbb" or null, texts
 * of at most 10'000 characters, due days 0-3650. The early payment discount
 * as the company profile checked it: a rate 0-100, then the days it's
 * offered within (1-365) - cleared without a rate - and a minimum 0 or more.
 */
export const normalizeTemplateData = (data: Partial<Record<keyof TemplateData, unknown>>): TemplateData => {
  const name = typeof data.name === "string" ? data.name.trim() : "";
  if (!name || name.length > 100) {
    throw new AppError("name is required, 100 characters at most", 400);
  }

  const discount = Number(data.early_payment_discount ?? 0);
  const minAmount = Number(data.early_payment_min_amount ?? 0);
  const discountDays = data.early_payment_days ?? null;
  if (!(discount >= 0 && discount <= 100)) {
    throw new AppError("early_payment_discount must be between 0 and 100", 400);
  }
  if (!(minAmount >= 0 && minAmount <= MAX_AMOUNT)) {
    throw new AppError("early_payment_min_amount must be between 0 and 9999999999.99", 400);
  }
  if (discount > 0 && !(Number.isInteger(discountDays) && (discountDays as number) >= 1 && (discountDays as number) <= 365)) {
    throw new AppError("early_payment_days must be a whole number of days between 1 and 365", 400);
  }

  const texts = Object.fromEntries(TEXT_FIELDS.map(field => [field, text(data[field], field)])) as Pick<TemplateData, typeof TEXT_FIELDS[number]>;

  return {
    name,
    layout: (DOCUMENT_LAYOUTS as readonly unknown[]).includes(data.layout) ? data.layout as TemplateData["layout"] : "CLASSIC",
    font: isFontFamily(data.font) ? data.font : "HELVETICA",
    accent_color: color(data.accent_color, "accent_color"),
    secondary_color: color(data.secondary_color, "secondary_color"),
    ...texts,
    quote_due_days: days(data.quote_due_days, "quote_due_days"),
    invoice_due_days: days(data.invoice_due_days, "invoice_due_days"),
    early_payment_discount: discount,
    early_payment_days: discount > 0 ? discountDays as number : null,
    early_payment_min_amount: minAmount,
  };
};

/** The look a template gives a document - what's frozen on it once it's sent. */
export const styleOf = (template: Pick<Template, keyof TemplateStyle>): TemplateStyle => ({
  layout: template.layout,
  font: template.font,
  accent_color: template.accent_color,
  secondary_color: template.secondary_color,
  header_image: template.header_image,
});

/** A document's look: frozen with it once sent, its template's as it is now while it's a draft. Anything unknown in a frozen one is the default. */
export const documentStyleOf = (frozen: Partial<TemplateStyle> | null, template: Pick<Template, keyof TemplateStyle>): TemplateStyle => {
  if (!frozen) {
    return styleOf(template);
  }
  return {
    layout: frozen.layout === "MODERN" ? "MODERN" : "CLASSIC",
    font: isFontFamily(frozen.font) ? frozen.font : "HELVETICA",
    accent_color: frozen.accent_color ?? null,
    secondary_color: frozen.secondary_color ?? null,
    header_image: frozen.header_image ?? null,
  };
};
