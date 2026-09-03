import { ClientWithAddresses } from "../../../modules/clients/client.types";
import { DocumentComplete } from "../../../modules/documents/document_complete.types";
import { Company } from "../../../modules/companies/company.types";
import { InvoiceDto } from "../invoice.types";

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
        // TODO: SECTION/NOTE lines (no quantity/unit_price) aren't rendered in the
        // PDF yet - only priced MATERIAL/SERVICE lines make it onto the invoice
        // for now. Proper section headers/notes in the PDF layout is future work,
        // tied to the "flexible document presentation" feature.
        lines: document.lines
            .filter((line): line is typeof line & { quantity: number; unit_price: number } =>
                line.quantity !== null && line.unit_price !== null
            )
            .map(line => ({
                label: line.label,
                quantity: line.quantity,
                unit: line.unit,
                unitPrice: line.unit_price,
            })),
        amountExclVat: document.amount_excl_vat,
        amountInclVat: document.amount_incl_vat,
        introduction: document.introduction ?? "",
        conclusion: document.conclusion ?? ""
    };

    return data;
}
