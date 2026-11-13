// Number and date formats printed on an invoice's first page, the Swiss
// way the company's own invoices already look: amounts as 1'578.75 (an
// apostrophe between thousands - the same in French and English here),
// dates as 03.09.2024.

export const formatAmount = (value: number): string => {
    const [integer, decimals] = Math.abs(value).toFixed(2).split(".");
    const grouped = integer.replace(/\B(?=(\d{3})+(?!\d))/g, "'");
    return `${value < 0 ? "-" : ""}${grouped}.${decimals}`;
};

// Always two decimals, like the amounts beside it: 8.10%, -3.00%.
export const formatPercent = (value: number): string => `${value.toFixed(2)}%`;

export const formatShortDate = (value: Date): string => {
    const date = new Date(value);
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${pad(date.getDate())}.${pad(date.getMonth() + 1)}.${date.getFullYear()}`;
};

// "2026-03-01" (a DATE kept as text, see deposit.ts's dateOnly) as 01.03.2026
// - read as written, never through a Date a time zone could shift.
export const formatPlainDate = (value: string): string => {
    const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
    return match ? `${match[3]}.${match[2]}.${match[1]}` : formatShortDate(new Date(value));
};

// CH85 0079 0016 2476 1501 2 - the IBAN in groups of four, as it's read out
// and printed on the QR-bill itself.
export const formatIban = (iban: string): string => iban.replace(/\s+/g, "").replace(/(.{4})(?=.)/g, "$1 ");
