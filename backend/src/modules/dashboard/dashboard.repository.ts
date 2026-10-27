import { db } from "../../shared/config/database";
import { OpenInvoice, PaidAmountByClient, ProjectInProgress } from "./dashboard.types";

// Sums amount_incl_vat (what the client actually paid, VAT included) across
// every PAID invoice, grouped by client. is_active is deliberately not
// filtered here - archiving an old invoice is just a list-visibility toggle
// (see CLAUDE.md's "Archive instead of delete"), it doesn't undo the fact
// that it was paid, so an archived paid invoice still counts toward the
// total. Ordered highest-paying client first.
export const getPaidAmountByClientFromDB = async (company_id: number): Promise<PaidAmountByClient[]> => {
  const query = `
    SELECT c.id AS client_id, c.client_number, c.company_name, c.first_name, c.last_name, c.is_placeholder,
           SUM(d.amount_incl_vat) AS total_paid
    FROM documents d
    JOIN clients c ON c.id = d.client_id
    WHERE d.company_id = $1 AND d.type = 'INVOICE' AND d.status = 'PAID'
    GROUP BY c.id, c.client_number, c.company_name, c.first_name, c.last_name, c.is_placeholder
    ORDER BY total_paid DESC;
  `;

  const result = await db().query(query, [company_id]);
  return result.rows;
};

// Every INVOICE sent but not yet paid (status = 'SENT' - PAID/CANCELLED/
// DRAFT don't belong here, and ACCEPTED/REJECTED only ever apply to a
// QUOTE), one row each - the dashboard adds them up on the table's last
// line. Same is_active reasoning as getPaidAmountByClientFromDB above -
// archiving is a list-visibility toggle, the client still owes it. The
// earliest due date first, so the overdue ones come out on top; those
// without a due date last. The client join is scoped to the company too,
// as everywhere else.
export const getOpenInvoicesFromDB = async (company_id: number): Promise<OpenInvoice[]> => {
  const query = `
    SELECT d.id, d.number, d.date, d.due_date, d.amount_incl_vat, d.recipient_name,
           c.id AS client_id, c.company_name, c.first_name, c.last_name, c.is_placeholder
    FROM documents d
    JOIN clients c ON c.id = d.client_id AND c.company_id = d.company_id
    WHERE d.company_id = $1 AND d.type = 'INVOICE' AND d.status = 'SENT'
    ORDER BY d.due_date ASC NULLS LAST, d.date ASC, d.id;
  `;

  const result = await db().query(query, [company_id]);
  return result.rows;
};

// Every active IN_PROGRESS chantier, in the chantiers list's own order (see
// project.repository.ts's getProjectsFromDB): the one whose closest section
// date is nearest to now first, those with no dated section last.
export const getProjectsInProgressFromDB = async (company_id: number): Promise<ProjectInProgress[]> => {
  const query = `
    SELECT p.id, p.name, pt.label AS project_type, closest.date_start AS closest_section_date,
           d.amount_excl_vat, d.recipient_name,
           c.id AS client_id, c.company_name, c.first_name, c.last_name, c.is_placeholder
    FROM projects p
    JOIN documents d ON d.id = p.document_id AND d.company_id = p.company_id
    JOIN clients c ON c.id = p.client_id AND c.company_id = p.company_id
    LEFT JOIN project_types pt ON pt.id = p.project_type_id
    LEFT JOIN LATERAL (
      SELECT ds.date_start
      FROM document_sections ds
      WHERE ds.document_id = p.document_id AND ds.date_start IS NOT NULL AND ds.is_active = true
      ORDER BY ABS(EXTRACT(EPOCH FROM (ds.date_start - NOW())))
      LIMIT 1
    ) closest ON true
    WHERE p.company_id = $1 AND p.status = 'IN_PROGRESS' AND p.is_active = true
    ORDER BY closest.date_start IS NULL, ABS(EXTRACT(EPOCH FROM (closest.date_start - NOW()))), p.id;
  `;

  const result = await db().query(query, [company_id]);
  return result.rows;
};
