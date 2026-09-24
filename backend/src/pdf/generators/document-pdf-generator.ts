import { buffer } from "stream/consumers";
import { PdfWriter } from "../core/pdf-writer";
import { getDocumentCompleteServ } from "../../modules/documents/document_complete.service";
import { DocumentComplete } from "../../modules/documents/document_complete.types";
import { getClientByIdServ } from "../../modules/clients/client.service";
import { ClientWithAddresses } from "../../modules/clients/client.types";
import { getCompanyByIdServ } from "../../modules/companies/company.service";
import { Company } from "../../modules/companies/company.types";
import { getFileServ } from "../../shared/storage/storage.service";

// Everything a PDF of one document is built from - loaded once by the
// skeleton below, handed to each step.
export interface PdfSource {
    document: DocumentComplete;
    client: ClientWithAddresses;
    company: Company;
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
        const source = await this.load(documentId, company_id);
        const prepared = await this.prepare(source);

        const pdf = await PdfWriter.create();
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
        return { document, client, company };
    }

    /** Hook: reject a document this kind of PDF makes no sense for (throw). Nothing by default. */
    protected validate(_document: DocumentComplete): void { }

    /** Gets everything `render` needs - DTOs, images, templates... - from what was loaded. */
    protected abstract prepare(source: PdfSource): Promise<TPrepared>;

    /** Draws the pages. Numbering and saving are the skeleton's job, not this one's. */
    protected abstract render(pdf: PdfWriter, prepared: TPrepared): Promise<void>;

    // Logos (and the invoice header image, same storage) live in MinIO/S3
    // (see shared/storage/storage.service.ts), not on local disk. No file,
    // not just none set, comes back the same way (null) - a PDF should still
    // render without one either way.
    protected async readCompanyImage(path: string | null): Promise<Buffer | null> {
        if (!path) return null;

        const file = await getFileServ(path);
        if (!file) return null;

        return await buffer(file.body);
    }

}
