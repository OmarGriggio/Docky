import { Request, Response } from "express";
import { getNotesServ, addNoteServ, updateNoteServ, deleteNoteServ } from "./calendar_note.service";
import { CreateCalendarNoteData, UpdateCalendarNoteData } from "./calendar_note.types";

export const getNotes = async (req: Request, res: Response) => {
  const notes = await getNotesServ(req.user.company_id);
  res.json(notes);
};

export const createNote = async (req: Request, res: Response) => {
  const noteData: CreateCalendarNoteData = req.body;

  const noteCreated = await addNoteServ(noteData, req.user.company_id);
  res.json(noteCreated);
};

export const updateNote = async (req: Request, res: Response) => {
  const noteData: UpdateCalendarNoteData = req.body;

  const noteUpdated = await updateNoteServ(Number(req.params.id), req.user.company_id, noteData);
  res.json(noteUpdated);
};

export const deleteNote = async (req: Request, res: Response) => {
  const noteDeleted = await deleteNoteServ(Number(req.params.id), req.user.company_id);
  res.json(noteDeleted);
};
