import { pool } from "../../shared/config/database";
import { CreateCalendarNoteData, UpdateCalendarNoteData } from "./calendar_note.types";

export const getNotesFromDB = async (company_id: number) => {
  const result = await pool.query(
    "SELECT * FROM calendar_notes WHERE company_id = $1 ORDER BY date_start",
    [company_id]
  );
  return result.rows;
};

export const getNoteByIdFromDB = async (id: number, company_id: number) => {
  const result = await pool.query(
    "SELECT * FROM calendar_notes WHERE id = $1 AND company_id = $2",
    [id, company_id]
  );
  return result.rows[0] ?? null;
};

export const createNoteInDB = async (note: CreateCalendarNoteData & { company_id: number }) => {
  const result = await pool.query(
    `INSERT INTO calendar_notes (company_id, title, description, date_start, date_end)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [note.company_id, note.title, note.description, note.date_start, note.date_end]
  );
  return result.rows[0];
};

export const updateNoteInDB = async (id: number, company_id: number, note: UpdateCalendarNoteData) => {
  const result = await pool.query(
    `UPDATE calendar_notes
     SET title = $1, description = $2, date_start = $3, date_end = $4
     WHERE id = $5 AND company_id = $6
     RETURNING *`,
    [note.title, note.description, note.date_start, note.date_end, id, company_id]
  );
  return result.rows[0] ?? null;
};

export const deleteNoteFromDB = async (id: number, company_id: number) => {
  const result = await pool.query(
    "DELETE FROM calendar_notes WHERE id = $1 AND company_id = $2 RETURNING *",
    [id, company_id]
  );
  return result.rows[0] ?? null;
};
