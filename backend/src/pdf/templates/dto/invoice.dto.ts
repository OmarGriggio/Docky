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

export const createInvoiceDto = (document: DocumentComplete, client: ClientWithAddresses, company: Company): InvoiceDto => {
    const address = client.addresses[0];

    const data: InvoiceDto = {
        number: document.number,
        date: document.date,
        company: {
            name: company.name ?? "",
            street: company.street ?? "",
            city: company.city ?? "",
            postalCodeCity: `${company.postal_code ?? ""} ${company.city ?? ""}`,
            logo: company.logo,
        },
        client: {
            name: client.company_name ?? `${client.first_name ?? ""} ${client.last_name ?? ""}`.trim(),
            street: address ? `${address.street}` : "",
            city: address.city ?? "",
            postalCodeCity: `${address.postal_code ?? ""} ${address.city ?? ""}`,
            title: client.title ?? "",
        },
        sections: buildSections(document),
        amountExclVat: document.amount_excl_vat,
        amountInclVat: document.amount_incl_vat,
        introduction: document.introduction ?? "",
        conclusion: document.conclusion ?? ""
    };

    return data;
}
