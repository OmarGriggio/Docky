// One row per client that has at least one PAID invoice - a client with
// none simply doesn't appear (see dashboard.repository.ts's INNER JOIN).
// Name fields are the raw client columns, same shape as Client - resolving
// a display name (company_name vs first_name/last_name) is left to the
// caller, same as everywhere else this already happens (e.g. the frontend's
// own clientNames computed signals).
export interface PaidAmountByClient {
  client_id: number;
  client_number: string;
  company_name: string | null;
  first_name: string | null;
  last_name: string | null;
  is_placeholder: boolean;
  total_paid: number;
}

// The client's raw name columns plus the recipient typed by hand on the
// document itself (a "Non défini" placeholder client's) - resolved to one
// display name by the frontend, same as PaidAmountByClient above.
interface DashboardClientName {
  client_id: number;
  company_name: string | null;
  first_name: string | null;
  last_name: string | null;
  is_placeholder: boolean;
  recipient_name: string | null;
}

// One SENT invoice still waiting for its payment - the dashboard's "to be
// paid" table, overdue first (see getOpenInvoicesFromDB).
export interface OpenInvoice extends DashboardClientName {
  id: number;
  number: string;
  date: Date;
  due_date: Date | null;
  amount_incl_vat: number;
}

// One chantier still IN_PROGRESS - the dashboard's "ongoing chantiers"
// table, the one needing attention soonest first (see
// getProjectsInProgressFromDB).
export interface ProjectInProgress extends DashboardClientName {
  id: number;
  name: string;
  project_type: string | null;
  // The date_start among its own sections closest to now - either way, same
  // as the chantiers list (see project.repository.ts's getProjectsFromDB).
  closest_section_date: Date | null;
  // Its resource ledger's own total so far (its PROJECT document's).
  amount_excl_vat: number;
}
