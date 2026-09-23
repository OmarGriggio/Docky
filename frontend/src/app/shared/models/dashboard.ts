// Mirrors the backend's dashboard.types.ts PaidAmountByClient - one row per
// client with at least one PAID invoice.
export interface PaidAmountByClient {
  client_id: number;
  client_number: string;
  company_name: string | null;
  first_name: string | null;
  last_name: string | null;
  total_paid: number;
}

// Mirrors the backend's dashboard.types.ts OpenInvoicesTotal - one row, not
// per-client, since it's a stat-tile headline total.
export interface OpenInvoicesTotal {
  total_open: number;
  count: number;
}
