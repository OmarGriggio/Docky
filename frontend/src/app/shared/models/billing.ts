import { DocumentStatus } from './document';

// A chantier's billing (GET /project/:id/billing, backend deposit.ts): its
// deposit invoices, its final invoice once there is one, and where it stands
// against the accepted quote - every amount incl. VAT.
export interface ChantierInvoice {
  id: number;
  number: string;
  date: string;
  status: DocumentStatus | null;
  amount_incl_vat: number;
}

// A deposit a final invoice deducts.
export interface DepositDeduction {
  document_id: number;
  number: string;
  date: string;
  amount_incl_vat: number;
}

export interface ChantierBilling {
  quoteNumber: string | null;
  // Null for a chantier created by hand, without a quote.
  quoteInclVat: number | null;
  // Deposits sent or paid.
  invoicedInclVat: number;
  paidInclVat: number;
  remainingInclVat: number | null;
  deposits: ChantierInvoice[];
  finalInvoice: ChantierInvoice | null;
  // What a final invoice created now would deduct.
  deductible: DepositDeduction[];
}

// GET /document/:id/deductions - a final invoice's deposits and its balance.
export interface DocumentDeductions {
  deductions: DepositDeduction[];
  amount_due: number;
}
