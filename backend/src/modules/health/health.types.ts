export type CheckStatus = "ok" | "error";

export interface HealthReport {
  status: CheckStatus;
  database: CheckStatus;
  storage: CheckStatus;
  // The running app's version (backend/package.json, see CHANGELOG.md) -
  // which release is deployed, at a glance.
  version: string;
}
