import { db } from "../../shared/config/database";
import { ErrorGroupStatus, ErrorGroupWithCompany, RecordErrorData } from "./error_log.types";

// One row per fingerprint: a new error inserts it, the same one again bumps
// its counter and refreshes what it looked like last time (message, stack,
// where, who). An error that comes back after being resolved is reopened.
export const recordErrorInDB = async (data: RecordErrorData): Promise<void> => {
  const query = `
    INSERT INTO error_groups (fingerprint, source, name, message, stack, location, last_company_id, last_user_id)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    ON CONFLICT (fingerprint) DO UPDATE SET
      occurrences = error_groups.occurrences + 1,
      last_seen_at = CURRENT_TIMESTAMP,
      message = EXCLUDED.message,
      stack = EXCLUDED.stack,
      location = EXCLUDED.location,
      last_company_id = EXCLUDED.last_company_id,
      last_user_id = EXCLUDED.last_user_id,
      resolved_at = NULL;
  `;
  await db().query(query, [
    data.fingerprint, data.source, data.name, data.message, data.stack, data.location, data.company_id, data.user_id,
  ]);
};

// Across every company on purpose (PLATFORM_ADMIN only, see
// error_log.routes.ts) - a bug is the platform's, whoever hit it. Most
// recently seen first.
export const getErrorGroupsFromDB = async (status: ErrorGroupStatus, limit: number): Promise<ErrorGroupWithCompany[]> => {
  const query = `
    SELECT eg.*, c.name AS last_company_name
    FROM error_groups eg
    LEFT JOIN companies c ON c.id = eg.last_company_id
    WHERE $1 = 'all'
       OR ($1 = 'open' AND eg.resolved_at IS NULL)
       OR ($1 = 'resolved' AND eg.resolved_at IS NOT NULL)
    ORDER BY eg.last_seen_at DESC
    LIMIT $2;
  `;
  const result = await db().query(query, [status, limit]);
  return result.rows;
};

export const setErrorGroupResolvedInDB = async (id: number, resolved: boolean): Promise<boolean> => {
  const result = await db().query(
    `UPDATE error_groups SET resolved_at = ${resolved ? "CURRENT_TIMESTAMP" : "NULL"} WHERE id = $1`,
    [id]
  );
  return (result.rowCount ?? 0) > 0;
};
