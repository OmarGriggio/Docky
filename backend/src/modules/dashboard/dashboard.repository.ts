import { pool } from "../../shared/config/database";
import { PaidAmountByClient } from "./dashboard.types";

// Sums amount_incl_vat (what the client actually paid, VAT included) across
// every PAID invoice, grouped by client. is_active is deliberately not
// filtered here - archiving an old invoice is just a list-visibility toggle
// (see CLAUDE.md's "Archive instead of delete"), it doesn't undo the fact
// that it was paid, so an archived paid invoice still counts toward the
// total. Ordered highest-paying client first.
export const getPaidAmountByClientFromDB = async (company_id: number): Promise<PaidAmountByClient[]> => {
  const query = `
    SELECT c.id AS client_id, c.client_number, c.company_name, c.first_name, c.last_name,
           SUM(d.amount_incl_vat) AS total_paid
    FROM documents d
    JOIN clients c ON c.id = d.client_id
    WHERE d.company_id = $1 AND d.type = 'INVOICE' AND d.status = 'PAID'
    GROUP BY c.id, c.client_number, c.company_name, c.first_name, c.last_name
    ORDER BY total_paid DESC;
  `;

  const result = await pool.query(query, [company_id]);
  return result.rows;
};
