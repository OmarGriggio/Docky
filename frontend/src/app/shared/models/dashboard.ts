// Mirrors the backend's dashboard.types.ts PaidAmountByClient - one row per
// client with at least one PAID invoice.
export interface PaidAmountByClient {
  client_id: number;
  client_number: string;
  company_name: string | null;
  first_name: string | null;
  last_name: string | null;
  // The "Non défini" client - every document made out to a recipient typed
  // by hand, grouped (see shared/models/client.ts).
  is_placeholder: boolean;
  total_paid: number;
}

// The client's raw name columns plus the recipient typed by hand on the
// document itself (a "Non défini" placeholder client's) - see
// Dashboard.clientName for how they become one name.
interface DashboardClientName {
  client_id: number;
  company_name: string | null;
  first_name: string | null;
  last_name: string | null;
  is_placeholder: boolean;
  recipient_name: string | null;
}

// Mirrors the backend's dashboard.types.ts OpenInvoice - a SENT invoice
// still waiting for its payment, earliest due date first.
export interface OpenInvoice extends DashboardClientName {
  id: number;
  number: string;
  date: string;
  due_date: string | null;
  amount_incl_vat: number;
}

// Mirrors the backend's dashboard.types.ts ProjectInProgress - an ongoing
// chantier, the one needing attention soonest first.
export interface ProjectInProgress extends DashboardClientName {
  id: number;
  name: string;
  project_type: string | null;
  closest_section_date: string | null;
  amount_excl_vat: number;
}
