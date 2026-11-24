// What a template may hold (template.types.ts) - checked on every save,
// pure so it's tested on its own (template.rules.test.ts).

import { isFontFamily } from "../../pdf/core/pdf-fonts";
import { AppError } from "../../shared/types/errors";
import { COLOR_ELEMENTS, DOCUMENT_LAYOUTS, ElementColors, FrozenTemplateStyle, MAX_PALETTE, PaletteColor, Template, TemplateData, TemplateStyle } from "./template.types";

const MAX_AMOUNT = 9999999999.99;
const MAX_TEXT = 10000;
const TEXT_FIELDS = [
  "quote_introduction", "quote_conclusion", "invoice_introduction", "invoice_conclusion", "payment_terms", "reminder_text", "reminder_text_2", "reminder_text_3",
] as const;

/** Up to 5 colors, each "#rrggbb" (stored lowercase) with a name of 30 characters at most - "Couleur n" when left blank. */
export const normalizePalette = (value: unknown): PaletteColor[] => {
  if (value === null || value === undefined) {
    return [];
  }
  if (!Array.isArray(value) || value.length > MAX_PALETTE) {
    throw new AppError(`palette must be a list of 5 colors at most`, 400);
  }
  return value.map((entry, index) => {
    const color = (entry as { color?: unknown } | null)?.color;
    const name = (entry as { name?: unknown } | null)?.name;
    if (typeof color !== "string" || !/^#[0-9a-f]{6}$/i.test(color)) {
      throw new AppError("palette colors must be like #b8860b", 400);
    }
    if (name !== undefined && name !== null && (typeof name !== "string" || name.trim().length > 30)) {
      throw new AppError("a palette color's name must be 30 characters at most", 400);
    }
    return { name: (typeof name === "string" && name.trim()) || `Couleur ${index + 1}`, color: color.toLowerCase() };
  });
};

/** Each known element's palette position (1 to the palette's length) - anything else left out: none. */
export const normalizeElementColors = (value: unknown, paletteLength: number): ElementColors => {
  if (value === null || value === undefined || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }
  const colors: ElementColors = {};
  for (const element of COLOR_ELEMENTS) {
    const position = Object.prototype.hasOwnProperty.call(value, element) ? (value as Record<string, unknown>)[element] : undefined;
    if (Number.isInteger(position) && (position as number) >= 1 && (position as number) <= paletteLength) {
      colors[element] = position as number;
    }
  }
  return colors;
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
 * and font (anything else the defaults), a palette of up to 5 colors and
 * the element colors pointing into it (normalizePalette/normalizeElementColors), texts
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

  const palette = normalizePalette(data.palette);
  const texts = Object.fromEntries(TEXT_FIELDS.map(field => [field, text(data[field], field)])) as Pick<TemplateData, typeof TEXT_FIELDS[number]>;

  return {
    name,
    layout: (DOCUMENT_LAYOUTS as readonly unknown[]).includes(data.layout) ? data.layout as TemplateData["layout"] : "CLASSIC",
    font: isFontFamily(data.font) ? data.font : "HELVETICA",
    palette,
    element_colors: normalizeElementColors(data.element_colors, palette.length),
    show_currency: data.show_currency === true,
    ...texts,
    quote_due_days: days(data.quote_due_days, "quote_due_days"),
    invoice_due_days: days(data.invoice_due_days, "invoice_due_days"),
    early_payment_discount: discount,
    early_payment_days: discount > 0 ? discountDays as number : null,
    early_payment_min_amount: minAmount,
  };
};

/**
 * A quote's payment terms: frozen with its look once it left DRAFT - a
 * template edited later never rewrites a quote the client already holds -
 * its template's as they are now while it's a draft (or frozen before they
 * were frozen with it).
 */
export const quotePaymentTermsOf = (frozen: FrozenTemplateStyle | null, template: Pick<Template, "payment_terms">): string | null =>
  frozen && "payment_terms" in frozen ? frozen.payment_terms ?? null : template.payment_terms;

/** The look a template gives a document - what's frozen on it once it's sent. */
export const styleOf = (template: Pick<Template, keyof TemplateStyle>): TemplateStyle => ({
  layout: template.layout,
  font: template.font,
  palette: template.palette,
  element_colors: template.element_colors,
  show_currency: template.show_currency === true,
  header_image: template.header_image,
});

/** A document's look: frozen with it once sent, its template's as it is now while it's a draft. Anything unknown in a frozen one is the default - a malformed palette none. */
export const documentStyleOf = (frozen: Partial<TemplateStyle> | null, template: Pick<Template, keyof TemplateStyle>): TemplateStyle => {
  if (!frozen) {
    return styleOf(template);
  }
  return {
    layout: frozen.layout === "MODERN" ? "MODERN" : "CLASSIC",
    font: isFontFamily(frozen.font) ? frozen.font : "HELVETICA",
    ...frozenColorsOf(frozen),
    show_currency: frozen.show_currency === true,
    header_image: frozen.header_image ?? null,
  };
};

// A frozen look's palette and element colors - checked like a saved one,
// none at all if it can't be read (never a failed PDF).
const frozenColorsOf = (frozen: Partial<TemplateStyle>): Pick<TemplateStyle, "palette" | "element_colors"> => {
  try {
    const palette = normalizePalette(frozen.palette);
    return { palette, element_colors: normalizeElementColors(frozen.element_colors, palette.length) };
  } catch {
    return { palette: [], element_colors: {} };
  }
};
