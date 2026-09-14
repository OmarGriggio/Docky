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
  total_paid: number;
}
