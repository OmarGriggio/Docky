import { DocumentStatus, DocumentType } from '../models/document';

// Where a document can go from its current status - the backend's
// SETTABLE_STATUSES (document.service.ts, the real rule), plus ACCEPTED for
// a quote (its own accept flow, POST /document/:id/accept). A sent invoice
// only moves forward, never back to draft. Nothing for an archived document
// (refused server-side) or one that's closed. The one table both the
// documents list and the document form read.
export const nextStatuses = (type: DocumentType, status: DocumentStatus | null, isActive = true): DocumentStatus[] => {
  if (!isActive) {
    return [];
  }
  if (type === 'INVOICE') {
    return status === 'DRAFT' ? ['SENT', 'PAID', 'CANCELLED'] : status === 'SENT' ? ['PAID', 'CANCELLED'] : [];
  }
  if (type === 'QUOTE') {
    return status === 'DRAFT' ? ['SENT', 'ACCEPTED', 'REJECTED'] : status === 'SENT' ? ['DRAFT', 'ACCEPTED', 'REJECTED'] : [];
  }
  return [];
};
