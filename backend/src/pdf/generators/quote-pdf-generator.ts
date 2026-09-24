import { PdfWriter } from "../core/pdf-writer";
import { QuoteTemplate } from "../templates/quote.template";
import { createQuoteDto } from "../templates/dto/quote.dto";
import { QuoteDto } from "../templates/quote.types";
import { DocumentPdfGenerator, PdfSource } from "./document-pdf-generator";

interface PreparedQuote {
    quote: QuoteDto;
    logoBytes: Buffer | null;
}

// Same page 1 recap/page 2 detail split as the invoice - no Swiss QR-bill
// page here though, there's nothing to pay yet on a quote, that only makes
// sense once it's become an invoice.
export class QuotePdfGenerator extends DocumentPdfGenerator<PreparedQuote> {

    protected async prepare({ document, client, company }: PdfSource): Promise<PreparedQuote> {
        return {
            quote: createQuoteDto(document, client, company),
            logoBytes: await this.readCompanyImage(company.logo),
        };
    }

    protected async render(pdf: PdfWriter, { quote, logoBytes }: PreparedQuote): Promise<void> {
        await QuoteTemplate.renderRecap(pdf, quote, logoBytes);

        pdf.newPage();
        QuoteTemplate.renderDetails(pdf, quote);
    }

}
