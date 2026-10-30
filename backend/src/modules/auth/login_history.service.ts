import { createLoginHistoryEntryInDB, getLoginHistoryFromDB, getLoginHistoryUsersFromDB } from "./login_history.repository";
import { AppError } from "../../shared/types/errors";
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

export const getLoginHistoryServ = async (limit?: number, user_id?: number) => {
  const safeLimit = Math.min(limit && limit > 0 ? limit : DEFAULT_LIMIT, MAX_LIMIT);
  if (user_id !== undefined && !(Number.isInteger(user_id) && user_id > 0 && user_id <= 2147483647)) {
    throw new AppError("Invalid user_id", 400);
  }
  return await getLoginHistoryFromDB(safeLimit, user_id ?? null);
};

export const getLoginHistoryUsersServ = async () => {
  return await getLoginHistoryUsersFromDB();
};
