import { formatAmount, formatPercent } from "./format";
import { PdfLabels } from "./pdf-labels";

// An invoice's payment conditions as a small scale, modelled on the
// company's own Excel invoices: below the early payment discount's minimum
// it's net; from it, the discount within its days, net within the due
// date's. Empty without an early payment discount - the conditions are then
// just text. Only what applies to this invoice is highlighted: under the
// minimum, the "below" line, never a discount the client can't take.
export interface PaymentScaleRow {
    label: string;
    value: string;
    // The row's band: the discount ("early") or the net one ("net").
    highlight: "early" | "net" | null;
}

export interface EarlyPaymentTerms {
    rate: number;
    days: number | null;
    minAmount: number;
}

// Whole days from the invoice's date to its due date - null without one.
export const daysUntilDue = (date: Date, dueDate: Date | null): number | null => {
    if (!dueDate) {
        return null;
    }
    const utc = (value: Date) => {
        const day = new Date(value);
        return Date.UTC(day.getFullYear(), day.getMonth(), day.getDate());
    };
    return Math.round((utc(dueDate) - utc(date)) / 86_400_000);
};

// `applies`: whether this invoice gets the discount at all - the same
// answer as the totals' own early payment line (computeEarlyPayment).
export const buildPaymentScale = (
    terms: EarlyPaymentTerms,
    dueDays: number | null,
    applies: boolean,
    labels: PdfLabels
): PaymentScaleRow[] => {
    if (!(terms.rate > 0) || !terms.days) {
        return [];
    }
    const rows: PaymentScaleRow[] = [];
    if (terms.minAmount > 0) {
        const minAmount = formatAmount(terms.minAmount);
        rows.push({ label: labels.belowAmount(minAmount), value: labels.net, highlight: applies ? null : "net" });
        rows.push({ label: labels.fromAmount(minAmount), value: "", highlight: null });
    }
    rows.push({ label: labels.days(terms.days), value: formatPercent(-terms.rate), highlight: applies ? "early" : null });
    // A due date no later than the discount's own days says nothing more.
    if (dueDays !== null && dueDays > terms.days) {
        rows.push({ label: labels.days(dueDays), value: labels.net, highlight: applies ? "net" : null });
    }
    return rows;
};
