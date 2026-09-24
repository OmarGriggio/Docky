import { getTemplateByTypeFromDB, upsertTemplateInDB } from "./document_template.repository";
import { DocumentTemplate, DocumentTemplateType } from "./document_template.types";
import { DEFAULT_DOCUMENT_CONCLUSION, DEFAULT_DOCUMENT_INTRODUCTION, DEFAULT_REMINDER_TEXT } from "./document_template.defaults";

// Nothing saved yet for a QUOTE/INVOICE is still a normal state (not a
// NotFoundError): the form just starts from the default below - only the
// greeting and signature (DEFAULT_DOCUMENT_INTRODUCTION/CONCLUSION) - rather than from nothing. Copied
// into each document at creation, nothing server-side reads it afterwards.
// A REMINDER is different: the reminder PDF is built from this row every time,
// so it falls back to the default text when nothing (or only blank text) was
// saved - same value the profile form pre-fills with. A row that exists is
// always returned as saved (a blank introduction there is deliberate).
export const getTemplateServ = async (type: DocumentTemplateType, company_id: number): Promise<DocumentTemplate> => {
  const template: DocumentTemplate | null = await getTemplateByTypeFromDB(type, company_id);

  if (type === "REMINDER") {
    return {
      id: template?.id ?? 0,
      company_id,
      type,
      introduction: template?.introduction?.trim() ? template.introduction : DEFAULT_REMINDER_TEXT,
      conclusion: null,
      due_days: null,
    };
  }

  return template ?? {
    id: 0,
    company_id,
    type,
    introduction: DEFAULT_DOCUMENT_INTRODUCTION,
    conclusion: DEFAULT_DOCUMENT_CONCLUSION,
    due_days: null,
  };
};

// Every field is optional: whatever is left out (undefined) keeps its saved
// value instead of being wiped to null, an explicit null clears it. That's
// what lets the document form's introduction/conclusion blocks each save
// only their own text as the new default (and only the profile page's
// "Modèles de documents" send everything, due_days included).
export const upsertTemplateServ = async (
  type: DocumentTemplateType,
  data: { introduction?: string | null; conclusion?: string | null; due_days?: number | null },
  company_id: number
) => {
  const existing = await getTemplateByTypeFromDB(type, company_id);

  return await upsertTemplateInDB({
    introduction: data.introduction !== undefined ? data.introduction : existing?.introduction ?? null,
    conclusion: data.conclusion !== undefined ? data.conclusion : existing?.conclusion ?? null,
    due_days: data.due_days !== undefined ? data.due_days : existing?.due_days ?? null,
    type,
    company_id,
  });
};
