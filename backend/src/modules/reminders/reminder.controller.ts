import { Request, Response } from "express";
import { NotFoundError } from "../../shared/types/errors";
import {
  deleteReminderServ, getInvoiceRemindersServ, getInvoicesToRemindServ, getReminderSettingsServ, sendReminderServ, updateReminderSettingsServ,
} from "./reminder.service";

// An id from the URL - anything but a positive whole number is a 404, never
// a database error (a 500 in the error log).
const idOf = (req: Request): number => {
  const id = Number(req.params.id);
  if (!Number.isSafeInteger(id) || id <= 0) {
    throw new NotFoundError();
  }
  return id;
};

export const getReminderSettings = async (req: Request, res: Response) => {
  res.json(await getReminderSettingsServ(req.user.company_id));
};

export const updateReminderSettings = async (req: Request, res: Response) => {
  res.json(await updateReminderSettingsServ(req.user.company_id, req.body));
};

export const getInvoicesToRemind = async (req: Request, res: Response) => {
  res.json(await getInvoicesToRemindServ(req.user.company_id));
};

export const getInvoiceReminders = async (req: Request, res: Response) => {
  res.json(await getInvoiceRemindersServ(idOf(req), req.user.company_id));
};

export const sendReminder = async (req: Request, res: Response) => {
  res.status(201).json(await sendReminderServ(idOf(req), req.user.company_id));
};

export const deleteReminder = async (req: Request, res: Response) => {
  await deleteReminderServ(idOf(req), req.user.company_id);
  res.status(204).end();
};
