import { getUnitsFromDB, getUnitByLabelFromDB, createUnitInDB, setUnitActiveInDB } from "./resource_unit.repository";
import { AppError, NotFoundError } from "../../shared/types/errors";

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
    // Typing a label that was removed from the list (archived) brings it
    // back rather than leaving it invisible - it can't be re-created, the
    // (company_id, label) pair is unique.
    if (!existing.is_active) {
      return (await setUnitActiveInDB(existing.id, company_id, true)) ?? existing;
    }
    return existing;
  }

  return await createUnitInDB({ company_id, label: trimmed, is_active: true });
};

// "Removes" a unit from the company's list - archived, not deleted, like the
// other lists (see CLAUDE.md). Nothing else references a unit: a line's or
// resource's own "unit" is free text, so existing documents are untouched.
export const archiveUnitServ = async (id: number, company_id: number) => {
  const unit = await setUnitActiveInDB(id, company_id, false);
  if (!unit) {
    throw new NotFoundError("Unit not found");
  }
  return unit;
};
