import { pool } from "../../shared/config/database";
import { OpenInvoicesTotal, PaidAmountByClient } from "./dashboard.types";

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

// Sums amount_incl_vat across every INVOICE that's been sent but not yet
// paid (status = 'SENT' - PAID/CANCELLED/DRAFT all don't belong here, and
// ACCEPTED/REJECTED only ever apply to a QUOTE, never an INVOICE - see
// document-list.ts's own invoiceStatusOptions on the frontend). Same
// is_active reasoning as getPaidAmountByClientFromDB above - archiving is
// a list-visibility toggle, it doesn't mean the client no longer owes it.
export const getOpenInvoicesTotalFromDB = async (company_id: number): Promise<OpenInvoicesTotal> => {
  const query = `
    SELECT COALESCE(SUM(amount_incl_vat), 0) AS total_open, COUNT(*)::int AS count
    FROM documents
    WHERE company_id = $1 AND type = 'INVOICE' AND status = 'SENT';
  `;

  const result = await pool.query(query, [company_id]);
  return result.rows[0];
};
