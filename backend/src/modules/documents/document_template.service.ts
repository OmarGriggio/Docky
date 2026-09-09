import { getTemplateByTypeFromDB, upsertTemplateInDB } from "./document_template.repository";
import { DocumentType } from "./document.types";

// null (not a NotFoundError) when nothing's been saved yet for this type -
// absence is a normal state here, not an error: the frontend just falls
// back to empty introduction/conclusion fields.
export const getTemplateServ = async (type: DocumentType, company_id: number) => {
  return await getTemplateByTypeFromDB(type, company_id);
};

export const upsertTemplateServ = async (
  type: DocumentType,
  data: { introduction: string | null; conclusion: string | null },
  company_id: number
) => {
  return await upsertTemplateInDB({ ...data, type, company_id });
};
