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

// A date_start/date_end value (document_sections) is a pure calendar date
// with no real time-of-day meaning, but stored as a genuine TIMESTAMP -
// app-date.pipe.ts already reads it via UTC getters to treat it as such
// (its own "UTC-only calendar-date semantics"). A p-datepicker, though,
// always displays/picks in the browser's LOCAL timezone: round-tripping a
// stored ISO string through a plain `new Date(iso)` (unchanged) into one of
// those, or a locally-picked Date straight through `.toISOString()` back
// into storage, silently shifts the calendar date by the local UTC offset -
// a real bug hit in project-list.ts (a date picked as the 20th got stored
// and redisplayed as the 19th). These two keep the calendar date itself
// stable across that round-trip, at the cost of the Date objects they touch
// technically holding the wrong *instant* - fine, since nothing here ever
// reads their time-of-day.
export const calendarDateFromIso = (iso: string): Date => {
  const parsed = new Date(iso);
  return new Date(parsed.getUTCFullYear(), parsed.getUTCMonth(), parsed.getUTCDate());
};

export const calendarDateToIso = (date: Date): string => {
  return new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())).toISOString();
};

export interface LabelableAddress {
  attention: string | null;
  street: string;
  postal_code: string;
  city: string;
}

// Used for the "Lieu/Bâtiment" picker (document-form.ts) - "Attention : "
// only shown when set, since not every address has one.
export const addressLabel = (address: LabelableAddress): string => {
  const prefix = address.attention ? `${address.attention} : ` : '';
  return `${prefix}${address.street}, ${address.postal_code} ${address.city}`;
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
