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

// documents.due_date is a Postgres DATE (a calendar day, no time - see
// AppDatePipe's own UTC comment). Sent as a plain "YYYY-MM-DD" built from the
// picked day's LOCAL parts - date.toISOString() would shift a local-midnight
// pick back to the previous day for anyone east of UTC, i.e. here.
export const toDateOnly = (date: Date): string => {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
};

// Reverse of toDateOnly - also accepts the backend's own ISO form
// ("2026-10-24T00:00:00.000Z") by reading only its leading "YYYY-MM-DD".
export const fromDateOnly = (value: string): Date => {
  const [year, month, day] = value.slice(0, 10).split('-').map(Number);
  return new Date(year, month - 1, day);
};

export const addDays = (date: Date, days: number): Date => {
  const result = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  result.setDate(result.getDate() + days);
  return result;
};

// How many whole days past its due date an invoice is - null unless it
// actually is overdue: a sent (SENT) invoice whose due_date (a calendar day,
// see fromDateOnly) is before today. Derived on the spot, not a stored
// status: PAID/CANCELLED/DRAFT are never overdue however old the date, and
// nothing would have to flip a status every night. Due today isn't overdue
// yet.
export const daysOverdue = (
  document: { type: string; status: DocumentStatus | null; due_date: string | null },
  today: Date = new Date()
): number | null => {
  if (document.type !== 'INVOICE' || document.status !== 'SENT' || !document.due_date) {
    return null;
  }

  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const days = Math.round((startOfToday.getTime() - fromDateOnly(document.due_date).getTime()) / 86400000);
  return days > 0 ? days : null;
};

// What a client with no title (clients.title NULL) is greeted with - matches
// the backend's own fallback (pdf/templates/document.placeholders.ts).
export const DEFAULT_CLIENT_TITLE = 'Madame, Monsieur';

// "24 septembre 2026" - same wording the PDFs print for a document's date.
export const formatLongDate = (date: Date): string => {
  return date.toLocaleDateString('fr-CH', { day: 'numeric', month: 'long', year: 'numeric' });
};

// Mirror of the backend's fillPlaceholders (pdf/templates/placeholders.ts) -
// the document form's read-only preview fills an introduction/conclusion the
// way the PDF will. Only the keys of `values` are replaced; anything else
// ({{typo}}) is left as typed. Same one-pass/own-property rules.
export const fillPlaceholders = (text: string, values: Record<string, string>): string => {
  return text.replace(/\{\{\s*([a-z_]+)\s*\}\}/g, (match, name: string) => {
    return Object.prototype.hasOwnProperty.call(values, name) ? values[name] : match;
  });
};

// Search-box matching for a list: every word typed must appear somewhere in
// the text, in any order, ignoring case and accents ("jose dupont" finds
// "José Dupont" and "Dupont José"). An empty query matches everything.
export const matchesSearch = (text: string, query: string): boolean => {
  const normalize = (value: string) => value.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const haystack = normalize(text);
  return normalize(query).split(/\s+/).filter(Boolean).every(word => haystack.includes(word));
};
