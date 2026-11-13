import { round2 } from "./document.calculations";
import { AppError } from "../../shared/types/errors";
import { DepositDeduction, DocumentStatus } from "./document.types";

// Deposit invoices ("factures d'acompte") on a chantier: as many as needed,
// at any time, before its one final invoice (which deducts them - see
// zz_docs). The rules here are pure; document.service.ts's
// addDepositInvoiceServ creates the invoice.

// Far below NUMERIC(12,2)'s own ceiling: the amount excl. VAT computed back
// and multiplied again must never overflow it.
const MAX_AMOUNT = 99999999.99;

export interface DepositRequest {
  // A percentage of the chantier's accepted quote, total incl. VAT...
  percent?: unknown;
  // ...or an amount incl. VAT - one of the two.
  amount_incl_vat?: unknown;
}

export interface DepositAmounts {
  // What the client is asked for, VAT included.
  inclVat: number;
  // The deposit's one line, VAT excluded - its total incl. VAT is computed back
  // from it like any invoice's (computeDocumentTotals), so it can land a
  // centime away from inclVat on an odd amount.
  exclVat: number;
  // The percentage asked, when it's one - printed on the line.
  percent: number | null;
}

const asNumber = (value: unknown): number | null => {
  if (value === null || value === undefined || value === "") {
    return null;
  }
  const number = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;
  return Number.isFinite(number) ? number : NaN;
};

// The amounts of a deposit asked as a percentage of the quote's total incl.
// VAT (`quoteInclVat`, null for a chantier created by hand - no quote, so no
// percentage) or as an amount incl. VAT. A 400 for anything else.
export const depositAmounts = (request: DepositRequest, quoteInclVat: number | null, vatRate: number): DepositAmounts => {
  const percent = asNumber(request.percent);
  const amount = asNumber(request.amount_incl_vat);
  if ((percent === null) === (amount === null)) {
    throw new AppError("Give either a percentage or an amount", 400);
  }

  let inclVat: number;
  if (percent !== null) {
    if (!(percent > 0 && percent <= 100)) {
      throw new AppError("percent must be more than 0 and at most 100", 400);
    }
    if (quoteInclVat === null) {
      throw new AppError("A percentage needs the chantier's quote - give an amount instead", 400, "DEPOSIT_NEEDS_QUOTE");
    }
    inclVat = round2(quoteInclVat * percent / 100);
  } else {
    if (!(amount! > 0 && amount! <= MAX_AMOUNT)) {
      throw new AppError("amount_incl_vat must be more than 0", 400);
    }
    inclVat = round2(amount!);
  }
  if (!(inclVat > 0)) {
    throw new AppError("The deposit comes to nothing", 400);
  }
  return { inclVat, exclVat: round2(inclVat / (1 + vatRate / 100)), percent };
};

export interface ChantierInvoice {
  id: number;
  number: string;
  date: Date;
  status: DocumentStatus | null;
  amount_incl_vat: number;
}

export interface BillingSummary {
  // The accepted quote's total incl. VAT - null for a chantier created by hand.
  quoteInclVat: number | null;
  // Invoices sent or paid - deposits, and the final invoice's balance once
  // there is one; a draft isn't the client's yet, a cancelled one never was.
  invoicedInclVat: number;
  paidInclVat: number;
  // What's left to invoice on the quote - null without a quote, nothing once
  // the final invoice is out (it bills the rest, whatever the quote said).
  remainingInclVat: number | null;
}

const counts = (invoice: ChantierInvoice) => invoice.status === "SENT" || invoice.status === "PAID";

// `final`: the chantier's final invoice, with its balance (amountDue) - null
// while there's none.
export const summarizeBilling = (
  quoteInclVat: number | null,
  deposits: ChantierInvoice[],
  final: { status: DocumentStatus | null; amountDue: number } | null = null
): BillingSummary => {
  const billed = [
    ...deposits.map(deposit => ({ status: deposit.status, amount: deposit.amount_incl_vat })),
    ...(final ? [{ status: final.status, amount: final.amountDue }] : []),
  ];
  const sum = (status: (s: DocumentStatus | null) => boolean) =>
    round2(billed.filter(invoice => status(invoice.status)).reduce((total, invoice) => total + Number(invoice.amount), 0));
  const invoicedInclVat = sum(s => s === "SENT" || s === "PAID");
  const finalOut = final !== null && (final.status === "SENT" || final.status === "PAID");
  return {
    quoteInclVat,
    invoicedInclVat,
    paidInclVat: sum(s => s === "PAID"),
    remainingInclVat: quoteInclVat === null ? null : finalOut ? 0 : round2(quoteInclVat - invoicedInclVat),
  };
};

// What a chantier's final invoice deducts: its deposits sent or paid - the
// client owes an unpaid one on its own invoice, so it's deducted all the same.
// A draft can't be there (it blocks the final invoice), a cancelled one never
// was the client's.
export const depositsToDeduct = (deposits: ChantierInvoice[]): DepositDeduction[] =>
  deposits
    .filter(counts)
    .map(({ id, number, date, amount_incl_vat }) => ({ document_id: id, number, date: dateOnly(date), amount_incl_vat }));

// A DATE column read back as a local midnight - kept as "2026-03-01", not an
// instant a server in another time zone would shift by a day.
const dateOnly = (date: Date | string): string => {
  if (typeof date === "string") {
    return date.slice(0, 10);
  }
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
};

// What's left to pay on an invoice once its deposits are deducted - the
// whole total for any other invoice. Negative: the client paid too much.
export const amountDue = (amountInclVat: number, deductions: DepositDeduction[]): number =>
  round2(amountInclVat - deductions.reduce((sum, deduction) => sum + Number(deduction.amount_incl_vat), 0));
