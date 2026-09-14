import {
  getProjectsFromDB,
  getProjectByIdFromDB,
  createProjectInDB,
  archiveProjectInDB,
  unarchiveProjectInDB,
  completeProjectInDB
} from "./project.repository";
import { CreateProjectData } from "./project.types";
import { createDocumentInDB } from "../documents/document.repository";
import { generateDocumentNumber } from "../documents/document.service";
import { AppError, NotFoundError } from "../../shared/types/errors";

export const getAllProjectsServ = async (company_id: number, includeArchived = false) => {
  return await getProjectsFromDB(company_id, includeArchived);
};

export const getProjectByIdServ = async (id: number, company_id: number) => {
  const project = await getProjectByIdFromDB(id, company_id);
  if (!project) {
    throw new NotFoundError("Project not found");
  }
  return project;
};

// A chantier created by hand (no quote behind it - see document.service.ts's
// acceptQuoteServ for that path) still needs its own backing PROJECT
// document (see project.types.ts) - created here first, with an empty
// resource ledger (document_sections/document_lines added afterwards from
// the chantier detail page, through the same endpoints a QUOTE/INVOICE
// already uses - nothing project-specific there).
export const addProjectServ = async (projectData: CreateProjectData, company_id: number) => {
  if (!projectData.client_id) {
    throw new AppError("A project needs a client", 400);
  }

  const number = await generateDocumentNumber(company_id, "PROJECT");

  const document = await createDocumentInDB({
    company_id,
    client_id: projectData.client_id,
    address_id: null,
    reference_client: null,
    parent_document_id: null,
    type: "PROJECT",
    number,
    date: new Date(),
    discount: 0,
    vat_rate: 0,
    status: null,
    introduction: null,
    conclusion: null,
    payment_terms: null,
    due_date: null,
    is_active: true,
    amount_excl_vat: 0,
    amount_incl_vat: 0,
  });

  return await createProjectInDB({ ...projectData, company_id, document_id: document.id });
};

export const archiveProjectServ = async (id: number, company_id: number) => {
  const project = await getProjectByIdFromDB(id, company_id);
  if (!project) {
    throw new NotFoundError("Project not found");
  }
  return await archiveProjectInDB(id, company_id);
};

export const unarchiveProjectServ = async (id: number, company_id: number) => {
  const project = await getProjectByIdFromDB(id, company_id);
  if (!project) {
    throw new NotFoundError("Project not found");
  }
  return await unarchiveProjectInDB(id, company_id);
};

export const completeProjectServ = async (id: number, company_id: number) => {
  const project = await getProjectByIdFromDB(id, company_id);
  if (!project) {
    throw new NotFoundError("Project not found");
  }
  return await completeProjectInDB(id, company_id);
};
