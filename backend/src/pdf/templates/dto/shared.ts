import { ClientWithAddresses } from "../../../modules/clients/client.types";
import { clientDisplayName } from "../../../modules/clients/client.display";
import { Company } from "../../../modules/companies/company.types";
import { DocumentComplete } from "../../../modules/documents/document_complete.types";
import { lineTotal } from "../../../modules/documents/document.calculations";
import { ClientDto, CompanyDto, DocumentSectionDto } from "../document.types";

// document.sections/lines are already scoped to this document and active-only
// (the repository queries default to is_active = true) - but neither comes
// back ordered by `position` from the DB (lines have no ORDER BY at all), so
// that has to happen here.
export const buildSections = (document: DocumentComplete): DocumentSectionDto[] => {
    return [...document.sections]
        .sort((a, b) => a.position - b.position)
        .map(section => {
            const lines = document.lines
                .filter(line => line.section_id === section.id)
                .sort((a, b) => a.position - b.position)
                .map(line => ({
                    label: line.label,
                    quantity: line.quantity,
                    unit: line.unit,
                    unitPrice: line.unit_price,
                    total: lineTotal(line),
                }));
            return {
                title: section.title,
                description: section.description,
                lines,
                total: lines.reduce((sum, line) => sum + line.total, 0),
            };
        })
        // A section with every line archived (or none added yet) has
        // nothing to print - skip it rather than showing a bare heading.
        .filter(section => section.lines.length > 0);
};

// The client's own billing address - always their primary one (or their
// first, if none is marked primary), same rule document-form.ts's own
// read-only address block uses on the frontend. Never documents.address_id
// - that's a separate, independently-picked "Lieu/Bâtiment" (see
// invoice.dto.ts's resolveLocation), not necessarily the same address at all.
export const resolveBillingAddress = (client: ClientWithAddresses) => {
    return client.addresses.find(a => a.is_primary) ?? client.addresses[0];
};

export const buildCompanyDto = (company: Company): CompanyDto => ({
    name: company.name ?? "",
    street: company.street ?? "",
    city: company.city ?? "",
    postalCodeCity: `${company.postal_code ?? ""} ${company.city ?? ""}`,
    logo: company.logo,
});

export const buildClientDto = (client: ClientWithAddresses): ClientDto => {
    const address = resolveBillingAddress(client);
    return {
        name: clientDisplayName(client),
        street: address ? `${address.street}` : "",
        city: address?.city ?? "",
        postalCodeCity: address ? `${address.postal_code ?? ""} ${address.city ?? ""}` : "",
    };
};
