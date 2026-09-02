// Pure display-formatting helpers — no HttpClient, no signals, nothing async.
// Same idea as backend/document.calculations.ts: same input always gives the
// same output, so no setup is needed to test them.

export interface NameableClient {
  company_name: string | null;
  first_name: string | null;
  last_name: string | null;
}

// Was copy-pasted identically in client-detail, project-form, project-list,
// document-form and document-detail — a client with a company_name shows that,
// an individual shows first_name + last_name.
export const clientDisplayName = (client: NameableClient): string => {
  return client.company_name || `${client.first_name ?? ''} ${client.last_name ?? ''}`.trim();
};

// Was copy-pasted identically (as an inline ternary) in every list that has
// archive/restore actions: clients, suppliers, projects, documents, resources.
export const archiveActionLabel = (is_active: boolean): 'Archiver' | 'Restaurer' => {
  return is_active ? 'Archiver' : 'Restaurer';
};
