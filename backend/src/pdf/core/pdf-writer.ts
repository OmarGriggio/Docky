import { PDFDocument, PDFFont, PDFPage, StandardFonts, rgb } from "pdf-lib";
import { PdfDocumentOptions, PdfTable, PdfTextOptions } from "./pdf-writer.types";

const DEFAULT_OPTIONS: Required<PdfDocumentOptions> = {
    margin: 50,
    pageSize: [595.28, 841.89], // A4
};

const LINE_SPACING = 16;

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
        this.ensureSpace();

        const size = options.size ?? 11;
        this.page.drawText(text, {
            x: this.options.margin,
            y: this.cursorY,
            size,
            font: options.bold ? this.boldFont : this.regularFont,
            color: rgb(0, 0, 0),
        });

        this.cursorY -= size + 4;
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

    async save(): Promise<Uint8Array> {
        return this.doc.save();
    }
}
