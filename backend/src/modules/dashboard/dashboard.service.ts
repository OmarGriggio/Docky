import { getPaidAmountByClientFromDB } from "./dashboard.repository";

export const getPaidAmountByClientServ = async (company_id: number) => {
  return await getPaidAmountByClientFromDB(company_id);
};
