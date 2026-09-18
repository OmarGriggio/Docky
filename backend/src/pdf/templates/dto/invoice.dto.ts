import { Address } from "../../../modules/clients/address.types";
import { ClientWithAddresses } from "../../../modules/clients/client.types";
import { DocumentComplete } from "../../../modules/documents/document_complete.types";
import { Company } from "../../../modules/companies/company.types";
import { InvoiceDto, InvoiceSectionDto } from "../invoice.types";

// document.sections/lines are already scoped to this document and active-only
// (the repository queries default to is_active = true) - but neither comes
// back ordered by `position` from the DB (lines have no ORDER BY at all), so
// that has to happen here.
const buildSections = (document: DocumentComplete): InvoiceSectionDto[] => {
    return [...document.sections]
        .sort((a, b) => a.position - b.position)
        .map(section => ({
            title: section.title,
            description: section.description,
            lines: document.lines
                .filter(line => line.section_id === section.id)
                .sort((a, b) => a.position - b.position)
                .map(line => ({
                    label: line.label,
                    quantity: line.quantity,
                    unit: line.unit,
                    unitPrice: line.unit_price,
                })),
        }))
        // A section with every line archived (or none added yet) has
        // nothing to print - skip it rather than showing a bare heading.
        .filter(section => section.lines.length > 0);
};

// The client's own billing address - always their primary one (or their
// first, if none is marked primary), same rule document-form.ts's own
// read-only address block uses on the frontend. Never documents.address_id
// - that's a separate, independently-picked "Lieu/Bâtiment" (see
// resolveLocation below), not necessarily the same address at all.
const resolveBillingAddress = (client: ClientWithAddresses) => {
    return client.addresses.find(a => a.is_primary) ?? client.addresses[0];
};

// null unless documents.address_id was actually picked - same
// "Attention : Street, NPA City" shape as the frontend's own addressLabel
// (shared/utils/display.ts), duplicated here rather than shared across
// front/back (different languages, no shared package between them).
const resolveLocation = (document: DocumentComplete, client: ClientWithAddresses): string | null => {
    if (document.address_id === null) {
        return null;
    }
    const address: Address | undefined = client.addresses.find(a => a.id === document.address_id);
    if (!address) {
        return null;
    }

    const prefix = address.attention ? `${address.attention} : ` : "";
    return `${prefix}${address.street}, ${address.postal_code} ${address.city}`;
};

export const createInvoiceDto = (document: DocumentComplete, client: ClientWithAddresses, company: Company): InvoiceDto => {
    const address = resolveBillingAddress(client);

    const data: InvoiceDto = {
        number: document.number,
        date: document.date,
        company: {
            name: company.name ?? "",
            street: company.street ?? "",
            city: company.city ?? "",
            postalCodeCity: `${company.postal_code ?? ""} ${company.city ?? ""}`,
            logo: company.logo,
            vatNumber: company.vat_number,
        },
        client: {
            name: client.company_name ?? `${client.first_name ?? ""} ${client.last_name ?? ""}`.trim(),
            street: address ? `${address.street}` : "",
            city: address?.city ?? "",
            postalCodeCity: address ? `${address.postal_code ?? ""} ${address.city ?? ""}` : "",
            title: client.title ?? "",
        },
        location: resolveLocation(document, client),
        referenceClient: document.reference_client,
        sections: buildSections(document),
        amountExclVat: document.amount_excl_vat,
        amountInclVat: document.amount_incl_vat,
        vatRate: document.vat_rate,
        discount: document.discount,
        paymentTerms: document.payment_terms,
        introduction: document.introduction ?? "",
        conclusion: document.conclusion ?? ""
    };

    return data;
}
