import { getUnitsFromDB, getUnitByLabelFromDB, createUnitInDB } from "./resource_unit.repository";
import { AppError } from "../../shared/types/errors";

export const getUnitsServ = async (company_id: number, includeArchived = false) => {
  return await getUnitsFromDB(company_id, includeArchived);
};

// Get-or-create: the document-form unit picker calls this when the user
// types a label that doesn't match any existing option, so picking it
// should just add it to the company's own list and use it - not fail with
// a conflict the user typed their way into by accident (see
// getUnitByLabelFromDB's case-insensitive match).
export const addUnitServ = async (label: string, company_id: number) => {
  const trimmed = label.trim();
  if (!trimmed) {
    throw new AppError("Label is required", 400);
  }

  const existing = await getUnitByLabelFromDB(trimmed, company_id);
  if (existing) {
    return existing;
  }

  return await createUnitInDB({ company_id, label: trimmed, is_active: true });
};
