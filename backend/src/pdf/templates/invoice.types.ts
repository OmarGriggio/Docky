import { ClientDto, CompanyDto, DocumentSectionDto } from "./document.types";
import { PdfLanguage } from "./pdf-labels";

export interface InvoiceDto {
    language: PdfLanguage;
    number: string;
    date: Date;
    company: CompanyDto & {
        // Null if not VAT-registered - see invoice.template.ts's own
        // renderRecap for how that's handled.
        vatNumber: string | null;
    };
    // Always the client's own billing address (primary, or its first one if
    // none is marked primary) - never documents.address_id, that's a
    // separate, independently-picked "Lieu/Bâtiment" (see location below).
    client: ClientDto;
    // documents.address_id, formatted - null unless one was actually picked
    // (see resolveLocation in invoice.dto.ts). Distinct from client above:
    // where the chantier/work itself is, not where the invoice is billed.
    location: string | null;
    referenceClient: string | null;
    sections: DocumentSectionDto[];
    amountExclVat: number;
    amountInclVat: number;
    vatRate: number;
    // A percentage (0 when none is applied) - the recap only shows a line
    // for it above that (see invoice.template.ts).
    discount: number;
    // documents.due_date - null shows nothing rather than a bare "-".
    dueDate: Date | null;
    paymentTerms: string | null;
    introduction: string;
    conclusion: string;
}
