import {
  getProjectTypesFromDB,
  getProjectTypeByIdFromDB,
  getProjectTypeByLabel,
  createProjectTypeInDB,
  deleteProjectTypeInDB
} from "./project_type.repository";
import { CreateProjectTypeData } from "./project_type.types";
import { NotFoundError, ConflictError } from "../../shared/types/errors";

export const getAllProjectTypesServ = async () => {
  return await getProjectTypesFromDB();
};

export const getProjectTypeByIdServ = async (id: number) => {
  const projectType = await getProjectTypeByIdFromDB(id);
  if (!projectType) {
    throw new NotFoundError("Project type not found");
  }
  return projectType;
};

export const addProjectTypeServ = async (projectTypeData: CreateProjectTypeData) => {
  const existingProjectType = await getProjectTypeByLabel(projectTypeData.label);
  if (existingProjectType) {
    throw new ConflictError("Project type already exists");
  }
  return await createProjectTypeInDB(projectTypeData);
};

// TODO: warn the caller if the project type is still referenced by projects before deleting it
export const deleteProjectTypeServ = async (id: number) => {
  const projectType = await getProjectTypeByIdFromDB(id);
  if (!projectType) {
    throw new NotFoundError("Project type not found");
  }
  return await deleteProjectTypeInDB(id);
};
