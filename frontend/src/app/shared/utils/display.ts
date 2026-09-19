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

// document_sections.date_start/date_end used to be treated as a pure
// calendar date with no real time-of-day meaning - not true anymore now
// that the calendar page (calendar.ts) can drop a section onto an exact
// time slot, so this field genuinely carries a real local instant these
// days, sometimes with a meaningful time, sometimes not (an all-day drop
// lands on local midnight). Read with plain `new Date(iso)`/write with
// plain `date.toISOString()` everywhere this field is touched - both
// naturally round-trip the *actual* local instant, time included, which
// is what every consumer (project-list.ts, project-resources.ts,
// calendar.ts) now expects. Used below to decide whether that instant is
// worth showing a time for at all.
export const hasTimeComponent = (date: Date): boolean => {
  return date.getHours() !== 0 || date.getMinutes() !== 0;
};

// document_sections' own date_start/date_end (see hasTimeComponent above) -
// shows the time too, but only when one was actually set, so a plain
// all-day date doesn't read as "00:00" for no reason. Local getters
// throughout (not app-date.pipe.ts's UTC ones) - see hasTimeComponent.
export const formatSectionDate = (value: string | Date): string => {
  const date = value instanceof Date ? value : new Date(value);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();

  if (!hasTimeComponent(date)) {
    return `${day}.${month}.${year}`;
  }

  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${day}.${month}.${year} ${hours}:${minutes}`;
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

// The one format for any price/amount on screen (unit price, line/section/
// document totals, amounts): always two decimals, a plain dot, no thousands
// separator - "1234.50", never "1'234.5". Used through the `price` pipe.
export const formatPrice = (value: number | null | undefined): string => {
  if (value === null || value === undefined || isNaN(value)) {
    return '';
  }
  return value.toFixed(2);
};
