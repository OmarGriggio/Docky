import { PdfWriter } from "../core/pdf-writer";
import { QuoteTemplate } from "../templates/quote.template";
import { createQuoteDto } from "../templates/dto/quote.dto";
import { QuoteDto } from "../templates/quote.types";
import { embedImage } from "../templates/letter";
import { drawLetterFooters, setUpLetterPages } from "../templates/business-letter";
import { DocumentPdfGenerator, PdfSource } from "./document-pdf-generator";

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

    protected async prepare({ document, client, company }: PdfSource): Promise<PreparedQuote> {
        return {
            quote: createQuoteDto(document, client, company),
            logoBytes: await this.readCompanyImage(company.logo),
            headerImageBytes: await this.readCompanyImage(company.header_image),
        };
    }

    protected async render(pdf: PdfWriter, { quote, logoBytes, headerImageBytes }: PreparedQuote): Promise<void> {
        const headerImage = headerImageBytes ? await embedImage(pdf, headerImageBytes) : null;
        setUpLetterPages(pdf, headerImage);

        await QuoteTemplate.renderRecap(pdf, quote, logoBytes, headerImage !== null);

        pdf.newPage();
        QuoteTemplate.renderDetails(pdf, quote);

        drawLetterFooters(pdf, quote);
    }

}
