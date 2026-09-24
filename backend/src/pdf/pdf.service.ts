import { InvoicePdfGenerator } from "./generators/invoice-pdf-generator";
import { QuotePdfGenerator } from "./generators/quote-pdf-generator";
import { ReminderPdfGenerator } from "./generators/reminder-pdf-generator";

// One entry point per kind of PDF - what the steps are (load, prepare, draw,
// number, save) and what each kind does differently live in
// generators/document-pdf-generator.ts and its subclasses.

export const generateInvoicePdfServ = (documentId: number, company_id: number): Promise<Uint8Array> =>
    new InvoicePdfGenerator().generate(documentId, company_id);

export const generateQuotePdfServ = (documentId: number, company_id: number): Promise<Uint8Array> =>
    new QuotePdfGenerator().generate(documentId, company_id);

// Payment reminder for an invoice - see ReminderPdfGenerator.
export const generateReminderPdfServ = (documentId: number, company_id: number): Promise<Uint8Array> =>
    new ReminderPdfGenerator().generate(documentId, company_id);
