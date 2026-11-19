// A company's own numbering (modules/numbering) - of its quotes and invoices,
// its clients and its resources: a format such as "FAC-{YYYY}-{NNNN}" -
// literal text, the year ({YYYY} 2026, {YY} 26) and the sequence ({N}, as
// many N as the digits it's padded to - a longer number isn't cut). Pure:
// building a number and the pattern finding the numbers already given out
// are tested on their own (number-format.test.ts).

export const DEFAULT_NUMBER_FORMATS = {
    QUOTE: "OFF-{YYYY}-{NNNN}",
    INVOICE: "FAC-{YYYY}-{NNNN}",
    PROJECT: "CH-{YYYY}-{NNNN}",
    CLIENT: "C{NNNN}",
    MATERIAL: "MAT{NNNN}",
    SERVICE: "SER{NNNN}",
} as const;

// documents.number, clients.client_number and resources.code are VARCHAR(50):
// the format's text and a sequence of up to 8 digits always fit.
export const MAX_FORMAT_LENGTH = 30;
const MAX_SEQUENCE_DIGITS = 8;
// Letters, digits and separators only - what a number reads well with, and
// what the QR-bill's references take from it (payment-reference.ts keeps
// its letters and digits).
const LITERAL = /^[A-Za-z0-9\-_./]*$/;
const TOKEN = /\{(YYYY|YY|N+)\}/g;

export type NumberFormatError =
    | "EMPTY"
    | "TOO_LONG"
    | "NO_SEQUENCE"
    | "SEVERAL_SEQUENCES"
    | "SEQUENCE_TOO_LONG"
    | "INVALID_CHARACTERS";

type Part = { kind: "text"; value: string } | { kind: "year" } | { kind: "shortYear" } | { kind: "sequence"; digits: number };

export const parseNumberFormat = (format: string): { parts: Part[] } | { error: NumberFormatError } => {
    if (!format) {
        return { error: "EMPTY" };
    }
    if (format.length > MAX_FORMAT_LENGTH) {
        return { error: "TOO_LONG" };
    }
    const parts: Part[] = [];
    let last = 0;
    for (const match of format.matchAll(TOKEN)) {
        parts.push({ kind: "text", value: format.slice(last, match.index) });
        const token = match[1];
        parts.push(token === "YYYY" ? { kind: "year" } : token === "YY" ? { kind: "shortYear" } : { kind: "sequence", digits: token.length });
        last = match.index! + match[0].length;
    }
    parts.push({ kind: "text", value: format.slice(last) });

    const textParts = parts.filter((part): part is { kind: "text"; value: string } => part.kind === "text");
    if (textParts.some(part => !LITERAL.test(part.value))) {
        return { error: "INVALID_CHARACTERS" };
    }
    const sequences = parts.filter((part): part is { kind: "sequence"; digits: number } => part.kind === "sequence");
    if (sequences.length === 0) {
        return { error: "NO_SEQUENCE" };
    }
    if (sequences.length > 1) {
        return { error: "SEVERAL_SEQUENCES" };
    }
    if (sequences[0].digits > MAX_SEQUENCE_DIGITS) {
        return { error: "SEQUENCE_TOO_LONG" };
    }
    return { parts: parts.filter(part => part.kind !== "text" || part.value !== "") };
};

const partsOf = (format: string): Part[] => {
    const parsed = parseNumberFormat(format);
    if ("error" in parsed) {
        throw new Error(`Invalid number format "${format}": ${parsed.error}`);
    }
    return parsed.parts;
};

/** Whether the sequence starts again every year - a format with the year in it. */
export const resetsEveryYear = (format: string): boolean =>
    partsOf(format).some(part => part.kind === "year" || part.kind === "shortYear");

/** "FAC-{YYYY}-{NNNN}", 2026, 12 -> "FAC-2026-0012". */
export const formatNumber = (format: string, year: number, sequence: number): string =>
    partsOf(format).map(part => {
        switch (part.kind) {
            case "text": return part.value;
            case "year": return String(year);
            case "shortYear": return String(year % 100).padStart(2, "0");
            case "sequence": return String(sequence).padStart(part.digits, "0");
        }
    }).join("");

const escapeRegex = (text: string) => text.replace(/[.*+?^${}()|[\]\\/-]/g, "\\$&");

/**
 * The numbers this format gives out in `year`, as an anchored regular
 * expression whose one group is the sequence - the same syntax for
 * JavaScript and Postgres' `~`/`substring(... from ...)`. Any number of
 * digits matches, whatever the padding - up to 15, what a bigint and a
 * JavaScript number read back exactly (a longer one typed by hand is left out).
 */
export const numberPattern = (format: string, year: number): string =>
    "^" + partsOf(format).map(part => {
        switch (part.kind) {
            case "text": return escapeRegex(part.value);
            case "year": return String(year);
            case "shortYear": return String(year % 100).padStart(2, "0");
            case "sequence": return "([0-9]{1,15})";
        }
    }).join("") + "$";

/**
 * The next sequence: one past the highest already given out with this
 * format (this year's, when it has the year), but never below `start` - the
 * number a company moving to Docky continues from - when it applies: a
 * start set for a year doesn't carry over to the next one, the sequence
 * starts again at 1 then.
 */
export const nextSequence = (
    highest: number | null,
    { start, startYear, year, yearly }: { start: number | null; startYear: number | null; year: number; yearly: boolean },
): number => {
    const startApplies = start !== null && (!yearly || startYear === year);
    return Math.max((highest ?? 0) + 1, startApplies ? start : 1);
};

/**
 * Whether two formats read each other's numbers - "F{NNNN}" and "F{NNNNN}",
 * "D{NNNN}" and "D{YY}{NNNN}" (D260001 reads as sequence 260001): two types
 * numbered that way would share one sequence, or jump. Tried on a number of
 * each, this year's.
 */
export const formatsOverlap = (a: string, b: string, year: number): boolean =>
    new RegExp(numberPattern(a, year)).test(formatNumber(b, year, 1))
    || new RegExp(numberPattern(b, year)).test(formatNumber(a, year, 1));
