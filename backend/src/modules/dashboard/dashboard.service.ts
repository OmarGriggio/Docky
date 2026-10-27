import { getOpenInvoicesFromDB, getPaidAmountByClientFromDB, getProjectsInProgressFromDB } from "./dashboard.repository";

export const getPaidAmountByClientServ = async (company_id: number) => {
  return await getPaidAmountByClientFromDB(company_id);
};

export const getOpenInvoicesServ = async (company_id: number) => {
  return await getOpenInvoicesFromDB(company_id);
};

export const getProjectsInProgressServ = async (company_id: number) => {
  return await getProjectsInProgressFromDB(company_id);
};
