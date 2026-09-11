import { Request, Response } from "express";
import path from "path";
import { addCompanyServ, getAllCompaniesServ, getCompanyByIdServ, updateCompanyServ, updateCompanyLogoServ } from "./company.service";
import { Company } from "./company.types";
import { EXTENSION_BY_MIME } from "./company.upload";
import { uploadFileServ, deleteFileServ } from "../../shared/storage/storage.service";

export const getCompanies = async (req: Request, res: Response) => {
  const companies = await getAllCompaniesServ();
  res.json(companies);
};

export const getCompany = async (req: Request, res: Response) => {
  const company = await getCompanyByIdServ(Number(req.params.id));
  res.json(company);
};

export const createCompany = async (req: Request, res: Response) => {
    const companyData: Omit<Company, "id"> = req.body

    const companyCreated = await addCompanyServ(companyData);
    res.json(companyCreated);
};

export const updateCompany = async (req: Request, res: Response) => {
    const companyData: Omit<Company, "id"> = req.body;

    const companyUpdated = await updateCompanyServ(Number(req.params.id), companyData);
    res.json(companyUpdated);
};

export const uploadCompanyLogo = async (req: Request, res: Response) => {
    if (!req.file) {
        res.status(400).json({ message: "Aucun fichier reçu" });
        return;
    }

    const companyId = Number(req.params.id);
    const extension = EXTENSION_BY_MIME[req.file.mimetype];
    const logo = path.posix.join("companies", String(companyId), `logo${extension}`);

    // Clean up a logo saved under a different extension (e.g. a jpg -> png
    // format change) so it doesn't linger as an orphan - S3 deletes are
    // idempotent, no need to check which one (if any) actually exists.
    for (const otherExtension of Object.values(EXTENSION_BY_MIME)) {
        if (otherExtension !== extension) {
            await deleteFileServ(path.posix.join("companies", String(companyId), `logo${otherExtension}`));
        }
    }

    await uploadFileServ(logo, req.file.buffer, req.file.mimetype);

    const company = await updateCompanyLogoServ(companyId, logo);
    res.json(company);
};
