import { buffer } from "stream/consumers";
import { PdfWriter } from "../core/pdf-writer";
import { isFontFamily } from "../core/pdf-fonts";
import { getDocumentCompleteServ } from "../../modules/documents/document_complete.service";
import { DocumentComplete } from "../../modules/documents/document_complete.types";
import { getClientByIdServ } from "../../modules/clients/client.service";
import { ClientWithAddresses } from "../../modules/clients/client.types";
import { getCompanyByIdServ } from "../../modules/companies/company.service";
import { Company } from "../../modules/companies/company.types";
import { getFileServ } from "../../shared/storage/storage.service";
import { DepositDeduction } from "../../modules/documents/document.types";
import { getDepositDeductionsServ } from "../../modules/documents/document.service";
import { amountDue } from "../../modules/documents/deposit";
import { Template, TemplateStyle } from "../../modules/templates/template.types";
import { templateOfDocumentServ } from "../../modules/templates/template.service";
import { documentStyleOf } from "../../modules/templates/template.rules";
import { printColorsOf } from "../templates/element-colors";

// Everything a PDF of one document is built from - loaded once by the
// skeleton below, handed to each step.
export interface PdfSource {
    document: DocumentComplete;
    client: ClientWithAddresses;
    company: Company;
    // The document's template (its reminder text, a quote's payment terms),
    // and its look: the template's, or what it was frozen with once sent.
    template: Template;
    style: TemplateStyle;
    // A chantier's final invoice: the deposits it deducts (none otherwise),
    // and what's left to pay - the QR-bill's amount (see deposit.ts).
    deductions: DepositDeduction[];
    amountDue: number;
    // The template editor's preview (template.sample.ts): a made-up
    // document - a QR-bill the company's profile can't make yet is left out
    // instead of failing it.
    sample?: boolean;
}

// The fixed order every document PDF (invoice, quote, payment reminder)
// goes through - load what it's built from, get it ready, draw, number the
// pages, serialize - so each kind only supplies what actually differs: how
// its data is prepared and how it's drawn (Template Method). A new kind of
// PDF is a subclass with `prepare` and `render`, nothing to copy.
//
// `TPrepared` is whatever `prepare` hands over to `render` - the DTO(s), the
// logo bytes, the QR-bill... - so `render` itself never fetches anything.
export abstract class DocumentPdfGenerator<TPrepared> {

    async generate(documentId: number, company_id: number): Promise<Uint8Array> {
        return this.generateFrom(await this.load(documentId, company_id));
    }

    /** The PDF of an already loaded source - a stored document's, or the template preview's sample. */
    async generateFrom(source: PdfSource): Promise<Uint8Array> {
        const prepared = await this.prepare(source);

        // In its template's font (pdf-fonts.ts) - Helvetica when unknown.
        const pdf = await PdfWriter.create({ font: isFontFamily(source.style.font) ? source.style.font : "HELVETICA" });
        // Its text in the template's text color (black without one) - never the QR-bill's (useStandardFont).
        pdf.setTextColor(printColorsOf(source.style).text);
        await this.render(pdf, prepared);

        // Only once everything is drawn: the total isn't known before then.
        pdf.drawPageNumbers();
        return pdf.save();
    }

    private async load(documentId: number, company_id: number): Promise<PdfSource> {
        const document = await getDocumentCompleteServ(documentId, company_id);
        this.validate(document);

        const client = await getClientByIdServ(document.client_id, company_id);
        const company = await getCompanyByIdServ(client.company_id);
        const deductions = await getDepositDeductionsServ(document, company_id);
        const template = await templateOfDocumentServ(document.template_id, company.id);
        const style = documentStyleOf(document.template_style, template);
        return { document, client, company, template, style, deductions, amountDue: amountDue(document.amount_incl_vat, deductions) };
    }

    /** Hook: reject a document this kind of PDF makes no sense for (throw). Nothing by default. */
    protected validate(_document: DocumentComplete): void { }

    /** Gets everything `render` needs - DTOs, images, templates... - from what was loaded. */
    protected abstract prepare(source: PdfSource): Promise<TPrepared>;

    /** Draws the pages. Numbering and saving are the skeleton's job, not this one's. */
    protected abstract render(pdf: PdfWriter, prepared: TPrepared): Promise<void>;

    // Logos (and the templates' header images, same storage) live in MinIO/S3
    // (see shared/storage/storage.service.ts), not on local disk. No file,
    // not just none set, comes back the same way (null) - a PDF should still
    // render without one either way. Only ever this company's own
    // logo/header key, the one its upload route builds - anything else
    // stored in companies.logo or a template's header_image (another
    // company's private attachment, say) is ignored rather than embedded in
    // this PDF.
    protected async readCompanyImage(company: Company, kind: "logo"): Promise<Buffer | null> {
        return this.readImage(company.logo, new RegExp(`^companies/${company.id}/${kind}\\.(jpg|png)$`));
    }

    /** The document's header image (its style's) - the company's own templates' keys only, the one migrated from the profile included. */
    protected async readHeaderImage(company: Company, style: TemplateStyle): Promise<Buffer | null> {
        return this.readImage(style.header_image, new RegExp(`^companies/${company.id}/(header|templates/\\d+/header-[0-9a-f]{12})\\.(jpg|png)$`));
    }

    private async readImage(path: string | null, allowed: RegExp): Promise<Buffer | null> {
        if (!path || !allowed.test(path)) return null;

        const file = await getFileServ(path);
        if (!file) return null;

        return await buffer(file.body);
    }

}
