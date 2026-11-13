import { PDFImage } from "pdf-lib";
import { PdfWriter } from "../core/pdf-writer";
import { PdfColor, PdfTextOptions } from "../core/pdf-writer.types";
import { ClientDto, CompanyDto, DocumentSectionDto } from "./document.types";
import { PDF_LABELS, PdfLanguage } from "./pdf-labels";
import { drawLogoTopRight, drawSectionDetails, placeHeaderImage } from "./letter";
import { formatAmount, formatIban, formatPercent, formatShortDate } from "./format";
import { tint } from "./accent-color";
import { PaymentScaleRow } from "./payment-scale";

// The layout invoices and quotes share, modelled on the company's own Excel
// invoices. Page 1: the client's number and the place/date on the left, the
// address on the right, the document's title and reference, one line per
// section ("Pos 1", "Pos 2"...) with its total, then the totals as a table
// without borders - label, rate, deduction, running total - the signature,
// and a block right after it in the right-hand column (payment conditions,
// a quote's validity). Page 2+: every section's own lines, then the same
// totals. On every page: the company's header image at the top and its
// details as a footer (but not on an invoice's QR-bill page, whose slip
// takes the whole bottom).

export interface LetterDto {
    language: PdfLanguage;
    number: string;
    date: Date;
    company: CompanyDto & {
        // Null if not VAT-registered - the VAT line then says just "TVA".
        vatNumber: string | null;
        // The footer - each line left out when unset.
        email: string | null;
        phone: string | null;
        iban: string | null;
        website: string | null;
        bankName: string | null;
        bankAccount: string | null;
        // The company's own color (see accent-color.ts) - null for a
        // black and white PDF.
        accentColor: PdfColor | null;
        // The second one - the titles (see drawLetterHead, drawLetterDetails).
        secondaryColor: PdfColor | null;
    };
    client: ClientDto & {
        // Both null for a recipient typed by hand (the "Non défini"
        // placeholder's own number/title mean nothing to the reader); the
        // title is also null for anything but an individual - see
        // dto/shared.ts's buildLetterDto.
        number: string | null;
        title: string | null;
    };
    referenceClient: string | null;
    sections: DocumentSectionDto[];
    // The stored totals (documents.amount_excl_vat/amount_incl_vat) - never
    // re-added here, so the PDF always matches the app and {{montant}}.
    amountExclVat: number;
    amountInclVat: number;
    vatRate: number;
    // A percentage, 0 when none is applied.
    discount: number;
    introduction: string;
    conclusion: string;
    // A chantier's final invoice: its deposits deducted under the total, and
    // the balance due (see deposit.ts) - none on any other document.
    deductions?: { label: string; amount: number }[];
    amountDue?: number;
}

// x positions on an A4 page (595pt wide, 50pt margins): the address block,
// and the right edges of the three number columns - rate ("Pos n" too),
// deduction, running total.
const ADDRESS_X = 330;
const RATE_RIGHT = 360;
const DEDUCTION_RIGHT = 450;
const TOTAL_RIGHT = 545;
const LABEL_MAX_WIDTH = RATE_RIGHT - 50 - 60;

const ROW = 18;
const GRAY = { r: 0.35, g: 0.35, b: 0.35 };
// With the company's accent color: how strongly it tints the band behind the
// total and the one behind the early payment line - light enough for black
// text on top. A band reaches a little past the text on either side.
const TOTAL_BAND_TINT = 0.22;
const EARLY_PAYMENT_BAND_TINT = 0.12;
const BAND_PADDING = 4;
// The bottom block sits in the right-hand column, under the client's
// address (ADDRESS_X) - its text wraps within it, the payment scale spans it.
const SCALE_WIDTH = TOTAL_RIGHT - ADDRESS_X;
const SCALE_ROW = 14;
const SCALE_GAP = 4;
const SCALE_TINT = 0.18;
const SCALE_GRAY = { r: 0.92, g: 0.92, b: 0.92 };

// The header image sits a little below the page's top edge, at most 2.5 cm
// tall, and the content starts the same distance below it whatever its
// height - an image under 1 cm still leaves the room of a 1 cm one.
const CM = 72 / 2.54;
const HEADER_TOP_GAP = 14;
const HEADER_MAX_HEIGHT = 2.5 * CM;
const HEADER_MIN_ROOM = 1 * CM;
const HEADER_GAP = 33;
// The footer's rule sits at y=48 - flowing text keeps a little air above it.
const FOOTER_TOP = 64;
// Between what's above the payment conditions block and the block itself.
const CONDITIONS_GAP = 20;

/** Every page from now on starts with the header image (if any) and keeps its flowing text clear of the footer. Call before drawing anything. */
export const setUpLetterPages = (pdf: PdfWriter, headerImage: PDFImage | null) => {
    pdf.setBottomLimit(FOOTER_TOP);
    pdf.setPageDecorator(() => {
        if (headerImage) {
            const height = placeHeaderImage(pdf, headerImage, HEADER_TOP_GAP, HEADER_MAX_HEIGHT);
            pdf.lowerCursorTo(pdf.pageHeight() - HEADER_TOP_GAP - Math.max(height, HEADER_MIN_ROOM) - HEADER_GAP);
        }
    });
};

/** The footer on every page left in the numbering - call last, once every page exists. */
export const drawLetterFooters = (pdf: PdfWriter, letter: LetterDto) => {
    pdf.forEachNumberedPage(() => drawFooter(pdf, letter));
};

/** Page 1 down to the title and reference: who, when, what - "FACTURE N° 3183" / "OFFRE N° 1057". */
export const drawLetterHead = async (
    pdf: PdfWriter,
    letter: LetterDto,
    { title, logoBytes, hasHeaderImage, extraReferenceLines = [] }: {
        title: string;
        logoBytes: Buffer | null;
        hasHeaderImage: boolean;
        // Printed under "Réf." - e.g. an invoice's Lieu/Bâtiment.
        extraReferenceLines?: string[];
    }
) => {
    const labels = PDF_LABELS[letter.language];
    const left = pdf.marginValue();

    // Without a header image, the company's name stands in for it.
    if (!hasHeaderImage) {
        pdf.text(letter.company.name, { bold: true, size: 14, marginBottom: 6 });
    }
    if (logoBytes) {
        pdf.lowerCursorTo(await drawLogoTopRight(pdf, logoBytes, pdf.remainingHeight()) - 10);
    }

    // Client number and place/date on the left, the address on the right,
    // side by side - the place/date on the address's third line. An address
    // line too long for its column (a long company name, a typed-in
    // recipient) wraps rather than running off the page.
    const client = letter.client;
    const addressOptions: PdfTextOptions = { size: 12 };
    const addressLines = [client.title, client.name, client.complement, client.street, client.postalCodeCity]
        .filter((line): line is string => !!line)
        .flatMap(line => pdf.wrapLines(line, TOTAL_RIGHT - ADDRESS_X, addressOptions));
    const top = pdf.remainingHeight() - 10;
    addressLines.forEach((line, index) => pdf.drawTextAt(line, ADDRESS_X, top - index * 16, addressOptions));
    if (client.number) {
        pdf.drawTextAt(`${labels.clientNumber} ${client.number}`, left, top, { size: 9 });
    }
    pdf.drawTextAt(labels.placeDate(letter.company.city, formatShortDate(letter.date)), left, top - 2 * 16, { size: 10 });
    pdf.lowerCursorTo(top - Math.max(addressLines.length, 3) * 16 - 20);

    if (letter.introduction) {
        pdf.text(letter.introduction, { size: 11, marginBottom: 14 });
    }

    // The title, bold and underlined - in the secondary color if there's
    // one - drawn by hand, so its room is reserved first (a long
    // introduction could otherwise push it onto the footer).
    const secondary = letter.company.secondaryColor;
    const titleOptions: PdfTextOptions = { size: 14, bold: true, ...(secondary ? { color: secondary } : {}) };
    pdf.reserve(44);
    const titleY = pdf.remainingHeight() - 14;
    pdf.drawTextAt(title, left, titleY, titleOptions);
    pdf.drawLineAt({ x: left, y: titleY - 3 }, { x: left + pdf.textWidth(title, titleOptions), y: titleY - 3 }, 1, secondary ?? undefined);
    pdf.moveDown(30);

    if (letter.referenceClient) {
        pdf.text(`${labels.reference} : ${letter.referenceClient}`, { size: 10, marginBottom: 2 });
    }
    for (const line of extraReferenceLines) {
        pdf.text(line, { size: 10, marginBottom: 2 });
    }
    pdf.moveDown(10);
};

/** One line per section: its title, "Pos n", its total. */
export const drawPositions = (pdf: PdfWriter, letter: LetterDto) => {
    const labels = PDF_LABELS[letter.language];
    letter.sections.forEach((section, index) => {
        row(pdf, fitText(pdf, section.title, LABEL_MAX_WIDTH, { size: 10 }), { rate: labels.position(index + 1), total: section.total });
    });
    pdf.moveDown(8);
};

/**
 * The totals, from the sections' sum down to the total incl. VAT - a line
 * left out when it has nothing to say (no discount, no VAT) - then
 * `earlyPayment`, an invoice's early payment discount, when there is one.
 */
export const drawTotalsTable = (
    pdf: PdfWriter,
    letter: LetterDto,
    earlyPayment: { days: number; rate: number; amount: number; net: number } | null = null
) => {
    const labels = PDF_LABELS[letter.language];
    const subtotal = letter.sections.reduce((sum, section) => sum + section.total, 0);
    const hasVat = letter.vatRate > 0;

    if (letter.discount > 0 || hasVat) {
        row(pdf, labels.total, { total: subtotal });
    }
    if (letter.discount > 0) {
        row(pdf, labels.discount, { rate: formatPercent(-letter.discount), deduction: letter.amountExclVat - subtotal, total: letter.amountExclVat });
    }
    if (hasVat) {
        // "TVA N° CHE-123.456.789" - the number is usually stored with its
        // own "TVA"/"MWST" suffix, which the label already says.
        const vatNumber = letter.company.vatNumber?.replace(/\s+(TVA|MWST|IVA|VAT)$/i, "");
        const vatLabel = vatNumber ? labels.vatWithNumber(vatNumber) : labels.vat;
        row(pdf, vatLabel, { rate: formatPercent(letter.vatRate), total: letter.amountInclVat - letter.amountExclVat });
    }

    // The total owed, between two rules - in the accent color, on a band of
    // it, when the company has one.
    const accent = letter.company.accentColor;
    const totalHeight = ROW + 6;
    pdf.reserve(ROW * 2);
    pdf.moveDown(4);
    if (accent) {
        band(pdf, pdf.remainingHeight() + 4, totalHeight, tint(accent, TOTAL_BAND_TINT));
    }
    rule(pdf, accent);
    row(pdf, labels.total, { total: letter.amountInclVat }, { size: 14, bold: true }, totalHeight);
    rule(pdf, accent);

    // A final invoice: each deposit deducted, then the balance - owed, or the
    // client's when the deposits were more - on the same band as the total.
    if (letter.deductions?.length && letter.amountDue !== undefined) {
        pdf.moveDown(4);
        for (const deduction of letter.deductions) {
            row(pdf, fitText(pdf, deduction.label, RATE_RIGHT - pdf.marginValue() - 10, { size: 10 }), { total: -deduction.amount });
        }
        pdf.reserve(ROW * 2);
        pdf.moveDown(4);
        if (accent) {
            band(pdf, pdf.remainingHeight() + 4, totalHeight, tint(accent, TOTAL_BAND_TINT));
        }
        rule(pdf, accent);
        row(pdf, letter.amountDue >= 0 ? labels.amountDue : labels.creditBalance, { total: Math.abs(letter.amountDue) }, { size: 14, bold: true }, totalHeight);
        rule(pdf, accent);
    }

    if (earlyPayment) {
        pdf.moveDown(6);
        pdf.reserve(ROW);
        if (accent) {
            band(pdf, pdf.remainingHeight() + 2, ROW, tint(accent, EARLY_PAYMENT_BAND_TINT));
        }
        row(pdf, labels.earlyPayment(earlyPayment.days), {
            rate: formatPercent(-earlyPayment.rate),
            deduction: -earlyPayment.amount,
            total: earlyPayment.net,
        }, { size: 11, bold: true });
        // Underlined in the accent color, at the band's bottom edge.
        if (accent) {
            pdf.moveDown(2);
            rule(pdf, accent);
        }
    }
    pdf.moveDown(10);
};

/** The signature/closing text under the totals. */
export const drawConclusion = (pdf: PdfWriter, letter: LetterDto) => {
    if (letter.conclusion) {
        pdf.text(letter.conclusion, { size: 11, marginTop: 6, marginBottom: 16 });
    }
};

/**
 * A heading and its lines right after the content above them, in the
 * right-hand column (payment conditions, a quote's validity) - the heading in the accent color
 * if there's one - then an invoice's payment scale (payment-scale.ts): a
 * small two-column table, the discount's row on a band of the accent color
 * and the net one on a band of the secondary color (light gray without
 * them). Kept in one piece - on the next page if it doesn't fit, never with
 * its heading left alone at the bottom of this one.
 */
export const drawConditionsBlock = (
    pdf: PdfWriter,
    heading: string,
    lines: string[],
    colors: { accent: PdfColor | null; secondary: PdfColor | null },
    scale: PaymentScaleRow[] = [],
) => {
    if (lines.length === 0 && scale.length === 0) {
        return;
    }
    const indent = ADDRESS_X - pdf.marginValue();
    const blocks: { text: string; options: PdfTextOptions }[] = [
        { text: `${heading} :`, options: { size: 10, bold: true, marginBottom: 4, indent, ...(colors.accent ? { color: colors.accent } : {}) } },
        ...lines.map(text => ({ text, options: { size: 10, indent } })),
    ];
    const scaleHeight = scale.length > 0 ? SCALE_GAP + scale.length * SCALE_ROW : 0;
    const height = blocks.reduce((sum, block) => sum + pdf.textHeight(block.text, block.options), 0) + scaleHeight;
    pdf.moveDown(CONDITIONS_GAP);
    pdf.reserve(height);
    for (const block of blocks) {
        pdf.text(block.text, block.options);
    }
    if (scale.length > 0) {
        drawPaymentScale(pdf, scale, colors);
    }
};

// Each row's text sits on the flowing cursor (text()'s own baseline), its
// band reaching a little above and below it.
const drawPaymentScale = (pdf: PdfWriter, scale: PaymentScaleRow[], colors: { accent: PdfColor | null; secondary: PdfColor | null }) => {
    const left = ADDRESS_X;
    const bands = {
        early: colors.accent ? tint(colors.accent, SCALE_TINT) : SCALE_GRAY,
        net: colors.secondary ? tint(colors.secondary, SCALE_TINT) : SCALE_GRAY,
    };
    pdf.moveDown(SCALE_GAP);
    for (const row of scale) {
        const y = pdf.remainingHeight();
        if (row.highlight) {
            pdf.drawRect(left - BAND_PADDING, y - 4, SCALE_WIDTH + BAND_PADDING * 2, SCALE_ROW, bands[row.highlight]);
        }
        pdf.drawTextAt(row.label, left, y, { size: 10 });
        if (row.value) {
            pdf.drawTextRightAt(row.value, left + SCALE_WIDTH, y, { size: 10 });
        }
        pdf.moveDown(SCALE_ROW);
    }
};

/** Page 2+: every section's own lines ("Pos 1 – ..." titles, a little space between sections), then the same totals as page 1. */
export const drawLetterDetails = (pdf: PdfWriter, letter: LetterDto, heading: string) => {
    drawSectionDetails(pdf, heading, letter.sections, letter.language, { numbered: true, sectionGap: 12, color: letter.company.secondaryColor });
    pdf.moveDown(16);
    drawTotalsTable(pdf, letter);
};

// One line of the recap: a label on the left and up to three right-aligned
// columns (a rate or "Pos n", a deduction, a running total).
const row = (
    pdf: PdfWriter,
    label: string,
    columns: { rate?: string; deduction?: number; total: number },
    options: PdfTextOptions = { size: 10 },
    height = ROW,
) => {
    pdf.reserve(height);
    const y = pdf.remainingHeight() - (options.size ?? 10);
    pdf.drawTextAt(label, pdf.marginValue(), y, options);
    if (columns.rate) {
        pdf.drawTextRightAt(columns.rate, RATE_RIGHT, y, { ...options, bold: false });
    }
    if (columns.deduction !== undefined) {
        pdf.drawTextRightAt(formatAmount(columns.deduction), DEDUCTION_RIGHT, y, { ...options, bold: false });
    }
    pdf.drawTextRightAt(formatAmount(columns.total), TOTAL_RIGHT, y, options);
    pdf.moveDown(height);
};

// In the accent color, a rule spans its band's width too.
const rule = (pdf: PdfWriter, color: PdfColor | null = null) => {
    const y = pdf.remainingHeight() + 4;
    const padding = color ? BAND_PADDING : 0;
    pdf.drawLineAt({ x: pdf.marginValue() - padding, y }, { x: TOTAL_RIGHT + padding, y }, 0.8, color ?? undefined);
};

// A colored background from `top` down `height` across the totals' width,
// drawn before the row it sits behind.
const band = (pdf: PdfWriter, top: number, height: number, color: PdfColor) => {
    const left = pdf.marginValue() - BAND_PADDING;
    pdf.drawRect(left, top - height, TOTAL_RIGHT + BAND_PADDING - left, height, color);
};

// A section title too long for its column is cut with an ellipsis rather
// than running into "Pos n" - the full title is on the detail page anyway.
const fitText = (pdf: PdfWriter, text: string, maxWidth: number, options: PdfTextOptions): string => {
    if (pdf.textWidth(text, options) <= maxWidth) {
        return text;
    }
    let cut = text;
    while (cut.length > 1 && pdf.textWidth(`${cut}…`, options) > maxWidth) {
        cut = cut.slice(0, -1);
    }
    return `${cut.trimEnd()}…`;
};

// The company's details in the bottom margin of a page, under a thin rule:
// name, address and bank on the left, website, email and phone on the
// right - each line only if it's set. Inside the margin, so it never
// collides with the flowing content; "Page X/Y" sits centered between the
// two columns, each kept clear of it (cut with "…" past FOOTER_COLUMN_WIDTH
// - a long bank name or website).
const FOOTER_COLUMN_WIDTH = 220;

const drawFooter = (pdf: PdfWriter, letter: LetterDto) => {
    const company = letter.company;
    const left = pdf.marginValue();
    const options: PdfTextOptions = { size: 7, color: GRAY };
    // With an accent color: the rule, the company's name (bold) and its
    // website and email in it.
    const accent = company.accentColor;
    const accentOptions: PdfTextOptions = accent ? { ...options, color: accent } : options;
    const leftOptions = [accent ? { ...accentOptions, bold: true } : options, options, options];
    const rightOptions = [accentOptions, accentOptions, options];

    const bank = [company.bankName, company.bankAccount].filter(Boolean).join(" ");
    const iban = company.iban ? `IBAN ${formatIban(company.iban)}` : "";
    const leftLines = [
        company.name,
        [company.street, company.postalCodeCity.trim()].filter(Boolean).join(", "),
        [bank, iban].filter(Boolean).join("   "),
    ];
    const rightLines = [company.website, company.email, company.phone];

    if (![...leftLines, ...rightLines].some(Boolean)) {
        return;
    }
    pdf.drawLineAt({ x: left, y: 48 }, { x: TOTAL_RIGHT, y: 48 }, 0.4, accent ?? undefined);
    [39, 30, 21].forEach((y, index) => {
        if (leftLines[index]) {
            pdf.drawTextAt(fitText(pdf, leftLines[index], FOOTER_COLUMN_WIDTH, leftOptions[index]), left, y, leftOptions[index]);
        }
        const right = rightLines[index];
        if (right) {
            pdf.drawTextRightAt(fitText(pdf, right, FOOTER_COLUMN_WIDTH, rightOptions[index]), TOTAL_RIGHT, y, rightOptions[index]);
        }
    });
};
