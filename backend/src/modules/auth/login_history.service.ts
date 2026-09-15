import { createLoginHistoryEntryInDB, getLoginHistoryFromDB } from "./login_history.repository";
import { CreateLoginHistoryData } from "./login_history.types";

const DEFAULT_LIMIT = 100;
const MAX_LIMIT = 500;

// Best-effort and never allowed to break login itself - a login attempt
// (successful or not) must still go through even if this write fails.
export const recordLoginAttemptServ = async (data: CreateLoginHistoryData): Promise<void> => {
  try {
    await createLoginHistoryEntryInDB(data);
  } catch (err) {
    console.error("login_history : " + err);
  }
};

export const getLoginHistoryServ = async (limit?: number) => {
  const safeLimit = Math.min(limit && limit > 0 ? limit : DEFAULT_LIMIT, MAX_LIMIT);
  return await getLoginHistoryFromDB(safeLimit);
};
