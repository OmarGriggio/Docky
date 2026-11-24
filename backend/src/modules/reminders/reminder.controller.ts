import { Request, Response } from "express";
import {
  deleteReminderServ, getInvoiceRemindersServ, getInvoicesToRemindServ, getReminderSettingsServ, sendReminderServ, updateReminderSettingsServ,
} from "./reminder.service";

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
  res.json(await getInvoiceRemindersServ(Number(req.params.id), req.user.company_id));
};

export const sendReminder = async (req: Request, res: Response) => {
  res.status(201).json(await sendReminderServ(Number(req.params.id), req.user.company_id));
};

export const deleteReminder = async (req: Request, res: Response) => {
  await deleteReminderServ(Number(req.params.id), req.user.company_id);
  res.status(204).end();
};
