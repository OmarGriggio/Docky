import { Client } from "./client.types";

// Same rule as the frontend's clientDisplayName (shared/utils/display.ts) -
// duplicated rather than shared across front/back (different languages,
// no shared package between them). `||`, not `??`: the client form sends
// company_name as '' (not null) for an individual.
export const clientDisplayName = (client: Client): string => {
  return client.company_name || `${client.first_name ?? ""} ${client.last_name ?? ""}`.trim();
};
