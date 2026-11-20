import { ConflictError, NotFoundError } from "../../shared/types/errors";
import { withTransaction } from "../../shared/config/database";
import { deleteFileServ } from "../../shared/storage/storage.service";
import { Language } from "../users/user.types";
import {
  createTemplateInDB, getDefaultTemplateFromDB, getTemplateByIdFromDB, getTemplatesFromDB, isHeaderImageInUseInDB,
  setDefaultTemplateInDB, setTemplateActiveInDB, updateTemplateHeaderImageInDB, updateTemplateInDB,
} from "./template.repository";
import { normalizeTemplateData } from "./template.rules";
import { Template, TemplateData } from "./template.types";
import { DEFAULT_DOCUMENT_CONCLUSION, DEFAULT_DOCUMENT_INTRODUCTION, DEFAULT_REMINDER_TEXT, DEFAULT_REMINDER_TEXT_EN } from "./template.defaults";

/** The company's templates - its Standard one created first if it has none at all (see getDefaultTemplateServ). */
export const getTemplatesServ = async (company_id: number, includeArchived = false): Promise<Template[]> => {
  await getDefaultTemplateServ(company_id);
  return getTemplatesFromDB(company_id, includeArchived);
};

export const getTemplateServ = async (id: number, company_id: number): Promise<Template> => {
  const template = await getTemplateByIdFromDB(id, company_id);
  if (!template) {
    throw new NotFoundError("Template not found");
  }
  return template;
};

/** What a company's first template starts as - created with the company, and the one a company without any gets. */
const starterTemplate = (name = "Standard"): TemplateData => normalizeTemplateData({
  name,
  quote_introduction: DEFAULT_DOCUMENT_INTRODUCTION,
  quote_conclusion: DEFAULT_DOCUMENT_CONCLUSION,
  invoice_introduction: DEFAULT_DOCUMENT_INTRODUCTION,
  invoice_conclusion: DEFAULT_DOCUMENT_CONCLUSION,
});

/** A new company's "Standard" template, its default (addCompanyServ - same transaction). */
export const createStarterTemplateServ = (company_id: number) =>
  createTemplateInDB(company_id, starterTemplate(), { is_default: true, header_image: null });

/** The company's default template - created if it has none at all (a company made before templates existed and missed by the migration). */
// Two requests creating it at once: the second hits templates_one_default
// (a unique violation) and reads the one the first created.
export const getDefaultTemplateServ = async (company_id: number): Promise<Template> => {
  const existing = await getDefaultTemplateFromDB(company_id);
  if (existing) {
    return existing;
  }
  try {
    return await createStarterTemplateServ(company_id);
  } catch (error) {
    const created = (error as { code?: string }).code === "23505" ? await getDefaultTemplateFromDB(company_id) : null;
    if (!created) throw error;
    return created;
  }
};

/** The template a document prints with: its own (archived ones included - it was picked before), else the company's default. */
export const templateOfDocumentServ = async (template_id: number | null, company_id: number): Promise<Template> =>
  (template_id != null ? await getTemplateByIdFromDB(template_id, company_id) : null) ?? await getDefaultTemplateServ(company_id);

/** A template a document may be given: the company's own and not archived - a 404 otherwise, like any id from a request. */
export const assertTemplateForDocumentServ = async (template_id: unknown, company_id: number): Promise<Template> => {
  if (template_id === null || template_id === undefined) {
    return await getDefaultTemplateServ(company_id);
  }
  const template = Number.isInteger(template_id) ? await getTemplateByIdFromDB(template_id as number, company_id) : null;
  if (!template || !template.is_active) {
    throw new NotFoundError("Template not found");
  }
  return template;
};

export const createTemplateServ = async (company_id: number, data: Partial<Record<keyof TemplateData, unknown>>): Promise<Template> =>
  createTemplateInDB(company_id, normalizeTemplateData({ ...starterTemplate(), ...data }), { is_default: false, header_image: null });

/** A copy of a template, header image included (the file shared - see isHeaderImageInUseInDB), never the default. */
export const duplicateTemplateServ = async (id: number, company_id: number, name: string): Promise<Template> => {
  const source = await getTemplateServ(id, company_id);
  return createTemplateInDB(company_id, normalizeTemplateData({ ...source, name }), { is_default: false, header_image: source.header_image });
};

// A field the request leaves out keeps its current value (like the company
// profile): a page on an older version doesn't wipe one added since.
export const updateTemplateServ = async (id: number, company_id: number, data: Partial<Record<keyof TemplateData, unknown>>): Promise<Template> => {
  const current = await getTemplateServ(id, company_id);
  const sent = Object.fromEntries(Object.entries(data ?? {}).filter(([, value]) => value !== undefined));
  const template = await updateTemplateInDB(id, company_id, normalizeTemplateData({ ...current, ...sent }));
  if (!template) {
    throw new NotFoundError("Template not found");
  }
  return template;
};

/** The template as it would be saved with `data` - for the preview, nothing written (its header image the stored one's). */
export const previewTemplateServ = async (id: number, company_id: number, data: Partial<Record<keyof TemplateData, unknown>>): Promise<Template> => {
  const current = await getTemplateServ(id, company_id);
  const sent = Object.fromEntries(Object.entries(data ?? {}).filter(([, value]) => value !== undefined));
  return { ...current, ...normalizeTemplateData({ ...current, ...sent }) };
};

export const setDefaultTemplateServ = async (id: number, company_id: number): Promise<Template> => {
  const template = await getTemplateServ(id, company_id);
  if (!template.is_active) {
    throw new ConflictError("An archived template can't be the default");
  }
  return (await withTransaction(() => setDefaultTemplateInDB(id, company_id)))!;
};

// Archived: no longer offered for a new document - those already using it
// keep printing with it. The default can't be: another one must be made the
// default first.
export const archiveTemplateServ = async (id: number, company_id: number): Promise<Template> => {
  const template = await getTemplateServ(id, company_id);
  if (template.is_default) {
    throw new ConflictError("The default template can't be archived");
  }
  return (await setTemplateActiveInDB(id, company_id, false))!;
};

export const unarchiveTemplateServ = async (id: number, company_id: number): Promise<Template> => {
  await getTemplateServ(id, company_id);
  return (await setTemplateActiveInDB(id, company_id, true))!;
};

/**
 * The template's header image set (a key its upload route built) or
 * removed. The previous file is deleted unless something else still prints
 * it - another template sharing it, a document sent with it.
 */
export const setTemplateHeaderImageServ = async (id: number, company_id: number, header_image: string | null): Promise<Template> => {
  const current = await getTemplateServ(id, company_id);
  const template = (await updateTemplateHeaderImageInDB(id, company_id, header_image))!;
  const previous = current.header_image;
  if (previous && previous !== header_image && !(await isHeaderImageInUseInDB(company_id, previous, id))) {
    await deleteFileServ(previous).catch(() => undefined);
  }
  return template;
};

/** The reminder's text: the template's own, or the default one in the client's language when it has none. */
export const reminderTextOf = (template: Pick<Template, "reminder_text">, language: Language): string =>
  template.reminder_text?.trim() ? template.reminder_text : language === "EN" ? DEFAULT_REMINDER_TEXT_EN : DEFAULT_REMINDER_TEXT;
