import { db } from "../../shared/config/database";
import { CreateLoginHistoryData, LoginHistoryUser } from "./login_history.types";

export const createLoginHistoryEntryInDB = async (data: CreateLoginHistoryData) => {
  const query = `
    INSERT INTO login_history (user_id, email, success, ip_address, user_agent)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING *;
  `;

  const result = await db().query(query, [data.user_id, data.email, data.success, data.ip_address, data.user_agent]);
  return result.rows[0];
};

// Joined with users/companies so a PLATFORM_ADMIN sees who (and which
// company) each login belongs to, not just a bare user_id - see
// login_history.routes.ts for why only that role can reach this at all.
// Not scoped to any one company on purpose - same reasoning. user_id narrows
// it to one user's own attempts (null: everyone's, failed attempts against an
// unknown email included).
export const getLoginHistoryFromDB = async (limit: number, user_id: number | null) => {
  const query = `
    SELECT lh.id, lh.user_id, lh.email, lh.success, lh.ip_address, lh.user_agent, lh.created_at,
           u.first_name, u.last_name, u.company_id, c.name AS company_name
    FROM login_history lh
    LEFT JOIN users u ON u.id = lh.user_id
    LEFT JOIN companies c ON c.id = u.company_id
    WHERE $2::int IS NULL OR lh.user_id = $2
    ORDER BY lh.created_at DESC
    LIMIT $1;
  `;

  const result = await db().query(query, [limit, user_id]);
  return result.rows;
};

// Every user (across every company, same reasoning as above) with at least
// one recorded login attempt - what the history page filters by.
export const getLoginHistoryUsersFromDB = async (): Promise<LoginHistoryUser[]> => {
  const query = `
    SELECT u.id, u.first_name, u.last_name, u.email, c.name AS company_name
    FROM users u
    JOIN companies c ON c.id = u.company_id
    WHERE EXISTS (SELECT 1 FROM login_history lh WHERE lh.user_id = u.id)
    ORDER BY c.name, u.last_name, u.first_name, u.email;
  `;

  const result = await db().query(query);
  return result.rows;
};
