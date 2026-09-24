import { PDFDocument, PDFFont, PDFImage, PDFPage, StandardFonts, rgb } from "pdf-lib";
import { PdfColor, PdfDocumentOptions, PdfTable, PdfTextOptions } from "./pdf-writer.types";

const DEFAULT_OPTIONS: Required<PdfDocumentOptions> = {
    margin: 50,
    pageSize: [595.28, 841.89], // A4
};

const LINE_SPACING = 16;

/** Converts a length in millimeters to PDF points, for templates laid out against a physical spec (e.g. Swiss QR-bill). */
export const mm = (value: number) => value * (72 / 25.4);

export class PdfWriter {

    private page: PDFPage;
    private cursorY: number;

    // Every page ever created, in order - drawPageNumbers() below needs the
    // full set (not just the current one) once everything else is drawn, to
    // know each page's own position and the final total. excludedPages
    // holds pages left out of that numbering entirely (the Swiss QR-bill's
    // own page, which has no room for extra printed content) - identity-
    // based (a PDFPage is a real object, one instance per page), not by
    // index, since a page can be excluded from the flowing side of the API
    // without this writer otherwise tracking "which index is that".
    private allPages: PDFPage[];
    private excludedPages = new Set<PDFPage>();

    private constructor(
        private readonly doc: PDFDocument,
        private readonly regularFont: PDFFont,
        private readonly boldFont: PDFFont,
        private readonly options: Required<PdfDocumentOptions>,
    ) {
        this.page = doc.addPage(options.pageSize);
        this.cursorY = this.page.getHeight() - options.margin;
        this.allPages = [this.page];
    }

    static async create(options: PdfDocumentOptions = {}): Promise<PdfWriter> {
        const doc = await PDFDocument.create();
        const regularFont = await doc.embedFont(StandardFonts.Helvetica);
        const boldFont = await doc.embedFont(StandardFonts.HelveticaBold);

        return new PdfWriter(doc, regularFont, boldFont, { ...DEFAULT_OPTIONS, ...options });
    }

    title(text: string) {
        this.text(text, { size: 18, bold: true });
        this.cursorY -= 6;
    }

    text(text: string, options: PdfTextOptions = {}) {
        const size = options.size ?? 11;
        const indent = options.indent ?? 0;
        const marginBottom = options.marginBottom ?? 0;
        const marginTop = options.marginTop ?? 0;
        const font = options.bold ? this.boldFont : this.regularFont;
        const maxWidth = this.page.getWidth() - this.options.margin * 2 - indent;

        this.cursorY -= marginTop;
        
        for (const paragraph of text.replace(/\t/g, " ").replace(/\r\n?/g, "\n").split("\n")) {
            for (const line of this.wrapText(paragraph, font, size, maxWidth)) {
                this.ensureSpace();

                this.page.drawText(line, {
                    x: this.options.margin + indent,
                    y: this.cursorY,
                    size,
                    font,
                    color: rgb(0, 0, 0),
                });

                this.cursorY -= size + 4;
            }
        }

        this.cursorY -= marginBottom;
    }

    private wrapText(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
        // Leading spaces are an indent the author typed on purpose (e.g. to
        // push a signature to the right) - split(" ") alone would drop them:
        // each empty "word" before the first real one lands on a still-empty
        // line and just replaces it with another empty string. Kept on the
        // first line only; a wrapped continuation line starts flush left.
        const leading = /^ */.exec(text)![0];
        const words = text.slice(leading.length).split(" ");
        const lines: string[] = [];
        let currentLine = "";

        for (const word of words) {
            const candidate = currentLine ? `${currentLine} ${word}` : (lines.length === 0 ? leading : "") + word;

            if (!currentLine || font.widthOfTextAtSize(candidate, size) <= maxWidth) {
                currentLine = candidate;
            } else {
                lines.push(currentLine);
                currentLine = word;
            }
        }
        lines.push(currentLine);

        return lines;
    }

    line() {
        this.ensureSpace();

        this.page.drawLine({
            start: { x: this.options.margin, y: this.cursorY },
            end: { x: this.page.getWidth() - this.options.margin, y: this.cursorY },
            thickness: 0.5,
            color: rgb(0.7, 0.7, 0.7),
        });

        this.cursorY -= LINE_SPACING;
    }

    table(table: PdfTable) {
        this.ensureSpace();

        let x = this.options.margin;
        for (const column of table.columns) {
            this.page.drawText(column.title, {
                x,
                y: this.cursorY,
                size: 11,
                font: this.boldFont,
                color: rgb(0, 0, 0),
            });
            x += column.width;
        }
        this.cursorY -= LINE_SPACING;

        this.line();

        for (const row of table.rows) {
            this.ensureSpace();

            x = this.options.margin;
            for (const column of table.columns) {
                const value = row[column.key];
                this.page.drawText(value == null ? "" : String(value), {
                    x,
                    y: this.cursorY,
                    size: 11,
                    font: this.regularFont,
                    color: rgb(0, 0, 0),
                });
                x += column.width;
            }
            this.cursorY -= LINE_SPACING;
        }
    }

    private ensureSpace() {
        if (this.cursorY < this.options.margin) {
            this.page = this.doc.addPage(this.options.pageSize);
            this.cursorY = this.page.getHeight() - this.options.margin;
            this.allPages.push(this.page);
        }
    }

    /** Starts a fresh page, independent of the text cursor, and returns to work on it. */
    newPage(size: [number, number] = this.options.pageSize) {
        this.page = this.doc.addPage(size);
        this.cursorY = this.page.getHeight() - this.options.margin;
        this.allPages.push(this.page);
    }

    pageWidth(): number {
        return this.page.getWidth();
    }

    /** How far above the very bottom of the current page the flowing text cursor still is - lets a caller decide whether a fixed-height block (e.g. the Swiss QR-bill's own 105mm) still fits below it without a new page. */
    remainingHeight(): number {
        return this.cursorY;
    }

    /** Moves the flowing cursor down to at least this Y, never back up - for after drawing something via an absolute-position primitive (e.g. a logo placed by hand), so text resumes safely below it instead of overlapping. */
    lowerCursorTo(y: number) {
        this.cursorY = Math.min(this.cursorY, y);
    }

    marginValue(): number {
        return this.options.margin;
    }

    pageHeight(): number {
        return this.page.getHeight();
    }

    /** Draws text at an explicit position, bypassing the flowing text cursor. */
    drawTextAt(text: string, x: number, y: number, options: PdfTextOptions = {}) {
        this.page.drawText(text, {
            x,
            y,
            size: options.size ?? 11,
            font: options.bold ? this.boldFont : this.regularFont,
            color: rgb(0, 0, 0),
        });
    }

    /** Draws a line between two explicit points, bypassing the flowing text cursor. */
    drawLineAt(from: { x: number; y: number }, to: { x: number; y: number }, thickness = 1) {
        this.page.drawLine({ start: from, end: to, thickness });
    }

    drawRect(x: number, y: number, width: number, height: number, color: PdfColor) {
        this.page.drawRectangle({ x, y, width, height, color: rgb(color.r, color.g, color.b) });
    }

    /** Draws an "L" tick at each corner of a rectangle, marking an empty field to fill in by hand. */
    drawCornerMarks(x1: number, y1: number, x2: number, y2: number, markLength = 8.5) {
        const corners = [
            { x: x1, y: y1, dx: 1, dy: 1 },
            { x: x2, y: y1, dx: -1, dy: 1 },
            { x: x1, y: y2, dx: 1, dy: -1 },
            { x: x2, y: y2, dx: -1, dy: -1 },
        ];

        for (const corner of corners) {
            this.drawLineAt({ x: corner.x, y: corner.y }, { x: corner.x + corner.dx * markLength, y: corner.y });
            this.drawLineAt({ x: corner.x, y: corner.y }, { x: corner.x, y: corner.y + corner.dy * markLength });
        }
    }

    async embedPng(imageBytes: Uint8Array): Promise<PDFImage> {
        return this.doc.embedPng(imageBytes);
    }

    async embedJpg(imageBytes: Uint8Array): Promise<PDFImage> {
        return this.doc.embedJpg(imageBytes);
    }

    /** opacity defaults to fully opaque (1) - pdf-lib's own drawImage option, passed straight through. */
    drawImage(image: PDFImage, x: number, y: number, width: number, height: number, opacity = 1) {
        this.page.drawImage(image, { x, y, width, height, opacity });
    }

    /** Draws an image centered horizontally on the page, advancing the flowing text cursor below it. */
    drawImageCentered(image: PDFImage, width: number, height: number, marginBottom = 0) {
        this.ensureSpace();

        const x = (this.page.getWidth() - width) / 2;
        this.cursorY -= height;
        this.page.drawImage(image, { x, y: this.cursorY, width, height });
        this.cursorY -= marginBottom;
    }

    /** Leaves the *current* page out of drawPageNumbers() below - e.g. right after drawing the Swiss QR-bill, whose own official layout has no room for extra printed content. */
    excludeCurrentPageFromNumbering() {
        this.excludedPages.add(this.page);
    }

    /** Draws "Page X/Y" centered in the bottom margin of every page not excluded via excludeCurrentPageFromNumbering() - X/Y only count those pages, so an excluded page (the QR-bill's own) doesn't shift or inflate the numbering of the rest. Call once, after all content is drawn: the total isn't known until then. */
    drawPageNumbers() {
        const numberedPages = this.allPages.filter(page => !this.excludedPages.has(page));
        const total = numberedPages.length;
        const size = 9;

        numberedPages.forEach((page, index) => {
            const label = `Page ${index + 1}/${total}`;
            const width = this.regularFont.widthOfTextAtSize(label, size);

            page.drawText(label, {
                x: (page.getWidth() - width) / 2,
                y: this.options.margin / 2 - size / 2,
                size,
                font: this.regularFont,
                color: rgb(0.5, 0.5, 0.5),
            });
        });
    }

    async save(): Promise<Uint8Array> {
        return this.doc.save();
    }
}
