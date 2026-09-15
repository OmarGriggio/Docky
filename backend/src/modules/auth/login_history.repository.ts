import { pool } from "../../shared/config/database";
import { CreateLoginHistoryData } from "./login_history.types";

export const createLoginHistoryEntryInDB = async (data: CreateLoginHistoryData) => {
  const query = `
    INSERT INTO login_history (user_id, email, success, ip_address, user_agent)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING *;
  `;

  const result = await pool.query(query, [data.user_id, data.email, data.success, data.ip_address, data.user_agent]);
  return result.rows[0];
};

// Joined with users/companies so a PLATFORM_ADMIN sees who (and which
// company) each login belongs to, not just a bare user_id - see
// login_history.routes.ts for why only that role can reach this at all.
// Not scoped to any one company on purpose - same reasoning.
export const getLoginHistoryFromDB = async (limit: number) => {
  const query = `
    SELECT lh.id, lh.user_id, lh.email, lh.success, lh.ip_address, lh.user_agent, lh.created_at,
           u.first_name, u.last_name, u.company_id, c.name AS company_name
    FROM login_history lh
    LEFT JOIN users u ON u.id = lh.user_id
    LEFT JOIN companies c ON c.id = u.company_id
    ORDER BY lh.created_at DESC
    LIMIT $1;
  `;

  const result = await pool.query(query, [limit]);
  return result.rows;
};
