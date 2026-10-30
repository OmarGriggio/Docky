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

// The route is public: without this, every request would take a database
// connection and call MinIO, and a flood of them would starve real traffic.
// One check at a time, its result reused for a few seconds - the cost stays
// the same however many requests come in. An uptime monitor calls every few
// minutes, so a 10s-old answer is still fresh for it.
const CACHE_MS = 10_000;
let cached: { report: HealthReport; at: number } | null = null;
let inFlight: Promise<HealthReport> | null = null;

const runChecks = async (): Promise<HealthReport> => {
  const [database, storage] = await Promise.all([check(pingDatabaseInDB), check(pingStorageServ)]);
  return { status: database === "ok" && storage === "ok" ? "ok" : "error", database, storage };
};

// Whether the API can actually serve requests, not just whether the process
// is up: the database and the file storage are checked too, in parallel.
export const getHealthServ = async (): Promise<HealthReport> => {
  if (cached && Date.now() - cached.at < CACHE_MS) {
    return cached.report;
  }
  inFlight ??= runChecks()
    .then(report => {
      cached = { report, at: Date.now() };
      return report;
    })
    .finally(() => {
      inFlight = null;
    });
  return inFlight;
};
