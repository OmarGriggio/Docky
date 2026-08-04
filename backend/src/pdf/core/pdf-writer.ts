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

    private constructor(
        private readonly doc: PDFDocument,
        private readonly regularFont: PDFFont,
        private readonly boldFont: PDFFont,
        private readonly options: Required<PdfDocumentOptions>,
    ) {
        this.page = doc.addPage(options.pageSize);
        this.cursorY = this.page.getHeight() - options.margin;
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
        const words = text.split(" ");
        const lines: string[] = [];
        let currentLine = "";

        for (const word of words) {
            const candidate = currentLine ? `${currentLine} ${word}` : word;

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
        }
    }

    /** Starts a fresh page, independent of the text cursor, and returns to work on it. */
    newPage(size: [number, number] = this.options.pageSize) {
        this.page = this.doc.addPage(size);
        this.cursorY = this.page.getHeight() - this.options.margin;
    }

    pageWidth(): number {
        return this.page.getWidth();
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

    drawImage(image: PDFImage, x: number, y: number, width: number, height: number) {
        this.page.drawImage(image, { x, y, width, height });
    }

    /** Draws an image centered horizontally on the page, advancing the flowing text cursor below it. */
    drawImageCentered(image: PDFImage, width: number, height: number, marginBottom = 0) {
        this.ensureSpace();

        const x = (this.page.getWidth() - width) / 2;
        this.cursorY -= height;
        this.page.drawImage(image, { x, y: this.cursorY, width, height });
        this.cursorY -= marginBottom;
    }

    async save(): Promise<Uint8Array> {
        return this.doc.save();
    }
}
