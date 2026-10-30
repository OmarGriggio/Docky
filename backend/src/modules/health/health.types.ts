export type CheckStatus = "ok" | "error";

export interface HealthReport {
  status: CheckStatus;
  database: CheckStatus;
  storage: CheckStatus;
}
