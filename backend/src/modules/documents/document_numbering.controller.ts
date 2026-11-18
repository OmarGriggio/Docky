import { Request, Response } from "express";
import { getNumberingServ, previewNumberingServ, updateNumberingServ } from "./document_numbering.service";

export const getNumbering = async (req: Request, res: Response) => {
    res.json(await getNumberingServ(req.user.company_id));
};

export const updateNumbering = async (req: Request, res: Response) => {
    const { number_format, start_number } = req.body ?? {};
    res.json(await updateNumberingServ(req.user.company_id, req.params.type, { number_format, start_number }));
};

export const previewNumbering = async (req: Request, res: Response) => {
    const { number_format, start_number } = req.body ?? {};
    res.json(await previewNumberingServ(req.user.company_id, req.params.type, { number_format, start_number }));
};
