// Pure display-formatting helpers — no HttpClient, no signals, nothing async.
// Same idea as backend/document.calculations.ts: same input always gives the
// same output, so no setup is needed to test them.

import { DocumentStatus } from '../models/document';

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

// A document's status is a raw DB enum value (see shared/models/document.ts)
// - never show it as-is, always through this (a quote/invoice list column,
// document-form's own header, ...). PrimeNG Tag severities, not raw colors.
const DOCUMENT_STATUS_LABELS: Record<DocumentStatus, string> = {
  DRAFT: 'Brouillon',
  SENT: 'Envoyée',
  ACCEPTED: 'Acceptée',
  REJECTED: 'Refusée',
  PAID: 'Payée',
  CANCELLED: 'Annulée',
};

const DOCUMENT_STATUS_SEVERITIES: Record<DocumentStatus, 'secondary' | 'info' | 'success' | 'danger'> = {
  DRAFT: 'secondary',
  SENT: 'info',
  ACCEPTED: 'success',
  REJECTED: 'danger',
  PAID: 'success',
  CANCELLED: 'danger',
};

export const documentStatusLabel = (status: DocumentStatus): string => {
  return DOCUMENT_STATUS_LABELS[status];
};

export const documentStatusSeverity = (status: DocumentStatus): 'secondary' | 'info' | 'success' | 'danger' => {
  return DOCUMENT_STATUS_SEVERITIES[status];
};

// Used for project attachments' size column - Ko/Mo, not KB/MB (French UI).
export const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) {
    return `${bytes} o`;
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} Ko`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
};
