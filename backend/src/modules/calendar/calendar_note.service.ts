import { CreateCalendarNoteData, UpdateCalendarNoteData } from "./calendar_note.types";
import { getNotesFromDB, getNoteByIdFromDB, createNoteInDB, updateNoteInDB, deleteNoteFromDB } from "./calendar_note.repository";
import { NotFoundError } from "../../shared/types/errors";

export const getNotesServ = async (company_id: number) => {
  return await getNotesFromDB(company_id);
};

export const addNoteServ = async (data: CreateCalendarNoteData, company_id: number) => {
  return await createNoteInDB({ ...data, company_id });
};

export const updateNoteServ = async (id: number, company_id: number, data: UpdateCalendarNoteData) => {
  const note = await getNoteByIdFromDB(id, company_id);
  if (!note) {
    throw new NotFoundError("Calendar note not found");
  }
  return await updateNoteInDB(id, company_id, data);
};

export const deleteNoteServ = async (id: number, company_id: number) => {
  const note = await getNoteByIdFromDB(id, company_id);
  if (!note) {
    throw new NotFoundError("Calendar note not found");
  }
  return await deleteNoteFromDB(id, company_id);
};
