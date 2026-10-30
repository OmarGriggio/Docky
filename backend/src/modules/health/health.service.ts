import { pingDatabaseInDB } from "./health.repository";
import { pingStorageServ } from "../../shared/storage/storage.service";
import { CheckStatus, HealthReport } from "./health.types";

// A dependency slower than this counts as down: a monitor waiting on a hung
// connection would otherwise time out itself and report nothing useful.
const CHECK_TIMEOUT_MS = 3000;

const check = async (probe: () => Promise<void>): Promise<CheckStatus> => {
  let timer: NodeJS.Timeout | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error("timeout")), CHECK_TIMEOUT_MS);
  });
  try {
    await Promise.race([probe(), timeout]);
    return "ok";
  } catch (err) {
    console.error("health : " + err);
    return "error";
  } finally {
    clearTimeout(timer);
  }
};

// Whether the API can actually serve requests, not just whether the process
// is up: the database and the file storage are checked too, in parallel.
export const getHealthServ = async (): Promise<HealthReport> => {
  const [database, storage] = await Promise.all([check(pingDatabaseInDB), check(pingStorageServ)]);
  return { status: database === "ok" && storage === "ok" ? "ok" : "error", database, storage };
};
