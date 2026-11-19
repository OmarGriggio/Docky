import { PdfWriter } from "../core/pdf-writer";
import { QuoteTemplate } from "../templates/quote.template";
import { createQuoteDto } from "../templates/dto/quote.dto";
import { QuoteDto } from "../templates/quote.types";
import { embedImage } from "../templates/letter";
import { drawLetterFooters, setUpLetterPages } from "../templates/business-letter";
import { DocumentPdfGenerator, PdfSource } from "./document-pdf-generator";
import { DocumentComplete } from "../../modules/documents/document_complete.types";
import { NotFoundError } from "../../shared/types/errors";

interface PreparedQuote {
    quote: QuoteDto;
    logoBytes: Buffer | null;
    headerImageBytes: Buffer | null;
}

// Same page 1 recap/page 2 detail split as the invoice, with the header
// image and the footer on every page - no Swiss QR-bill page here though,
// there's nothing to pay yet on a quote, that only makes sense once it's
// become an invoice.
export class QuotePdfGenerator extends DocumentPdfGenerator<PreparedQuote> {

    // Only a quote - see InvoicePdfGenerator's validate.
    protected override validate(document: DocumentComplete): void {
        if (document.type !== "QUOTE") {
            throw new NotFoundError("Quote not found");
        }
    }

    protected async prepare({ document, client, company, style, template }: PdfSource): Promise<PreparedQuote> {
        return {
            quote: createQuoteDto(document, client, company, style, template),
            logoBytes: await this.readCompanyImage(company, "logo"),
            headerImageBytes: await this.readHeaderImage(company, style),
        };
    }

    protected async render(pdf: PdfWriter, { quote, logoBytes, headerImageBytes }: PreparedQuote): Promise<void> {
        const headerImage = headerImageBytes ? await embedImage(pdf, headerImageBytes) : null;
        setUpLetterPages(pdf, headerImage);

        await QuoteTemplate.renderRecap(pdf, quote, logoBytes, headerImage !== null);

        // The modern layout has every line on page 1 already.
        if (quote.company.layout === "CLASSIC") {
            pdf.newPage();
            QuoteTemplate.renderDetails(pdf, quote);
        }

        drawLetterFooters(pdf, quote);
    }

}
