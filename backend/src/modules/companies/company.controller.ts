import { Request, Response } from "express";
import path from "path";
import { addCompanyServ, getAllCompaniesServ, getCompanyByIdServ, updateCompanyServ, updateCompanyLogoServ } from "./company.service";
import { Company } from "./company.types";

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

    const logo = path.posix.join("companies", String(req.params.id), req.file.filename);
    const company = await updateCompanyLogoServ(Number(req.params.id), logo);
    res.json(company);
};
