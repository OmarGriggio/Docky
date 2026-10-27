import { PDFImage } from "pdf-lib";
import { PdfWriter } from "../core/pdf-writer";
import { PdfTextOptions } from "../core/pdf-writer.types";
import { ClientDto, CompanyDto, DocumentSectionDto } from "./document.types";
import { PDF_LABELS, PdfLanguage } from "./pdf-labels";
import { drawLogoTopRight, drawSectionDetails, placeHeaderImage } from "./letter";
import { formatAmount, formatIban, formatPercent, formatShortDate } from "./format";

// The layout invoices and quotes share, modelled on the company's own Excel
// invoices. Page 1: the client's number and the place/date on the left, the
// address on the right, the document's title and reference, one line per
// section ("Pos 1", "Pos 2"...) with its total, then the totals as a table
// without borders - label, rate, deduction, running total - the signature,
// and a block anchored at the bottom of the page (payment conditions, a
// quote's validity). Page 2+: every section's own lines, then the same
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

// The header image sits a little below the page's top edge, and the content
// starts a little below it.
const HEADER_TOP_GAP = 14;
const HEADER_GAP = 25;
// The footer's rule sits at y=48 - flowing text keeps a little air above it,
// and the bottom block sits right above that.
const FOOTER_TOP = 64;
const BOTTOM_BLOCK_BOTTOM = 62;

/** Every page from now on starts with the header image (if any) and keeps its flowing text clear of the footer. Call before drawing anything. */
export const setUpLetterPages = (pdf: PdfWriter, headerImage: PDFImage | null) => {
    pdf.setBottomLimit(FOOTER_TOP);
    pdf.setPageDecorator(() => {
        if (headerImage) {
            placeHeaderImage(pdf, headerImage, HEADER_TOP_GAP);
            pdf.moveDown(HEADER_GAP);
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

    // The title, bold and underlined - drawn by hand, so its room is
    // reserved first (a long introduction could otherwise push it onto the
    // footer).
    const titleOptions: PdfTextOptions = { size: 14, bold: true };
    pdf.reserve(44);
    const titleY = pdf.remainingHeight() - 14;
    pdf.drawTextAt(title, left, titleY, titleOptions);
    pdf.drawLineAt({ x: left, y: titleY - 3 }, { x: left + pdf.textWidth(title, titleOptions), y: titleY - 3 }, 1);
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

    // The total owed, between two rules.
    pdf.reserve(ROW * 2);
    pdf.moveDown(4);
    rule(pdf);
    row(pdf, labels.total, { total: letter.amountInclVat }, { size: 14, bold: true }, ROW + 6);
    rule(pdf);

    if (earlyPayment) {
        pdf.moveDown(6);
        row(pdf, labels.earlyPayment(earlyPayment.days), {
            rate: formatPercent(-earlyPayment.rate),
            deduction: -earlyPayment.amount,
            total: earlyPayment.net,
        }, { size: 11, bold: true });
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
 * A heading and its lines at the bottom of the page, just above the footer
 * (payment conditions, a quote's validity). If the content above already
 * reaches down there, it simply follows it instead - never drawn over it.
 */
export const drawBottomBlock = (pdf: PdfWriter, heading: string, lines: string[]) => {
    if (lines.length === 0) {
        return;
    }
    const blocks: { text: string; options: PdfTextOptions }[] = [
        { text: `${heading} :`, options: { size: 10, bold: true, marginBottom: 4 } },
        ...lines.map(text => ({ text, options: { size: 10 } })),
    ];
    const height = blocks.reduce((sum, block) => sum + pdf.textHeight(block.text, block.options), 0);
    const top = BOTTOM_BLOCK_BOTTOM + height;
    if (pdf.remainingHeight() - 10 > top) {
        pdf.moveCursorTo(top);
    } else {
        // It follows the content instead - on a page of its own if need be,
        // never with its heading left alone at the bottom of this one.
        pdf.reserve(height);
    }
    for (const block of blocks) {
        pdf.text(block.text, block.options);
    }
};

/** Page 2+: every section's own lines ("Pos 1 – ..." titles, a little space between sections), then the same totals as page 1. */
export const drawLetterDetails = (pdf: PdfWriter, letter: LetterDto, heading: string) => {
    drawSectionDetails(pdf, heading, letter.sections, letter.language, { numbered: true, sectionGap: 12 });
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

const rule = (pdf: PdfWriter) => {
    const y = pdf.remainingHeight() + 4;
    pdf.drawLineAt({ x: pdf.marginValue(), y }, { x: TOTAL_RIGHT, y }, 0.8);
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
    pdf.drawLineAt({ x: left, y: 48 }, { x: TOTAL_RIGHT, y: 48 }, 0.4);
    [39, 30, 21].forEach((y, index) => {
        if (leftLines[index]) {
            pdf.drawTextAt(fitText(pdf, leftLines[index], FOOTER_COLUMN_WIDTH, options), left, y, options);
        }
        const right = rightLines[index];
        if (right) {
            pdf.drawTextRightAt(fitText(pdf, right, FOOTER_COLUMN_WIDTH, options), TOTAL_RIGHT, y, options);
        }
    });
};
