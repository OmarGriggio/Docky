import { getOpenInvoicesTotalFromDB, getPaidAmountByClientFromDB } from "./dashboard.repository";

export const getPaidAmountByClientServ = async (company_id: number) => {
  return await getPaidAmountByClientFromDB(company_id);
};

export const getOpenInvoicesTotalServ = async (company_id: number) => {
  return await getOpenInvoicesTotalFromDB(company_id);
};
