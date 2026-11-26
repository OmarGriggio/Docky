import { Company } from "../companies/company.types";
import { ClientWithAddresses } from "../clients/client.types";
import { DocumentComplete } from "../documents/document_complete.types";
import { DocumentLine } from "../documents/document_line.types";
import { DocumentSection } from "../documents/document_section.types";
import { computeDocumentTotals } from "../documents/document.calculations";
import { Language } from "../users/user.types";
import { styleOf } from "./template.rules";
import { Template } from "./template.types";
import type { PdfSource } from "../../pdf/generators/document-pdf-generator";

// The template editor's live preview (POST /template/:id/preview): a made-up
// quote, invoice or reminder - a sample client, two sections, a few lines -
// printed with the company's real identity (name, address, IBAN, logo) and
// the template as it's being edited. Pure: nothing read, nothing written.

export const PREVIEW_KINDS = ["QUOTE", "INVOICE", "REMINDER"] as const;
export type PreviewKind = typeof PREVIEW_KINDS[number];

type SampleLine = [label: string, quantity: number, unit: string, unitPrice: number, discount: number, type: DocumentLine["type"]];

const SAMPLE = {
  FR: {
    client: { title: "Madame", first_name: "Marie", last_name: "Dupont", street: "Rue du Marché 12", city: "Sion", country: "Suisse" },
    reference: "Appartement 3e étage",
    sections: [
      ["Préparation du chantier", [
        ["Protection des sols et des meubles", 1, "Forfait", 180, 0, "SERVICE"],
        ["Main-d'œuvre", 6, "Heure", 85, 0, "SERVICE"],
      ]],
      ["Peinture", [
        ["Peinture murale, 2 couches", 42, "m²", 18.5, 0, "SERVICE"],
        ["Fourniture peinture", 3, "Pot", 64.9, 10, "MATERIAL"],
      ]],
    ] as [string, SampleLine[]][],
  },
  EN: {
    client: { title: "Ms", first_name: "Jane", last_name: "Smith", street: "Market Street 12", city: "Sion", country: "Switzerland" },
    reference: "Third-floor flat",
    sections: [
      ["Site preparation", [
        ["Floor and furniture protection", 1, "Flat rate", 180, 0, "SERVICE"],
        ["Labour", 6, "Hour", 85, 0, "SERVICE"],
      ]],
      ["Painting", [
        ["Wall painting, 2 coats", 42, "m²", 18.5, 0, "SERVICE"],
        ["Paint supply", 3, "Tin", 64.9, 10, "MATERIAL"],
      ]],
    ] as [string, SampleLine[]][],
  },
};

const addDays = (date: Date, days: number) => new Date(date.getTime() + days * 24 * 60 * 60 * 1000);

/**
 * What a preview prints: the sample document of that kind, in `language`,
 * made out by `company` with `template` - its texts, due days, payment terms
 * and (an invoice's) early payment discount, like a new document would
 * start. A reminder's invoice was sent 45 days ago, due 15 days ago.
 */
export const sampleSourceOf = (company: Company, template: Template, kind: PreviewKind, language: Language, today = new Date()): PdfSource => {
  const sample = language === "EN" ? SAMPLE.EN : SAMPLE.FR;
  const type = kind === "QUOTE" ? "QUOTE" : "INVOICE";
  const year = today.getFullYear();

  const sections: DocumentSection[] = [];
  const lines: DocumentLine[] = [];
  sample.sections.forEach(([title, sectionLines], sectionIndex) => {
    const section_id = sectionIndex + 1;
    sections.push({
      id: section_id, company_id: company.id, document_id: 0, position: sectionIndex + 1, title,
      description: null, date_start: null, date_end: null, note: null, is_active: true,
    });
    sectionLines.forEach(([label, quantity, unit, unit_price, discount, lineType], lineIndex) => lines.push({
      id: lines.length + 1, company_id: company.id, document_id: 0, section_id, position: lineIndex + 1,
      type: lineType, label, quantity, unit, unit_price, discount, resource_id: null, is_active: true,
    }));
  });

  const vat_rate = Number(company.vat_rate ?? 0);
  const totals = computeDocumentTotals(lines, 0, vat_rate);
  const date = kind === "REMINDER" ? addDays(today, -45) : today;
  const dueDays = (type === "QUOTE" ? template.quote_due_days : template.invoice_due_days) ?? 30;
  const isInvoice = type === "INVOICE";

  const document: DocumentComplete = {
    id: 0,
    company_id: company.id,
    client_id: 0,
    address_id: null,
    reference_client: sample.reference,
    // An invoice's work done over the two weeks before it.
    service_date_start: isInvoice ? addDays(date, -14) : null,
    service_date_end: isInvoice ? addDays(date, -3) : null,
    parent_document_id: null,
    type,
    number: `${isInvoice ? "FAC" : "OFF"}-${year}-0001`,
    date,
    ...totals,
    discount: 0,
    vat_rate,
    status: kind === "REMINDER" ? "SENT" : "DRAFT",
    introduction: isInvoice ? template.invoice_introduction : template.quote_introduction,
    conclusion: isInvoice ? template.invoice_conclusion : template.quote_conclusion,
    payment_terms: template.payment_terms,
    due_date: kind === "REMINDER" ? addDays(today, -15) : addDays(date, dueDays),
    early_payment_discount: isInvoice ? template.early_payment_discount : 0,
    early_payment_days: isInvoice ? template.early_payment_days : null,
    early_payment_min_amount: isInvoice ? template.early_payment_min_amount : 0,
    is_active: true,
    recipient_name: null, recipient_complement: null, recipient_street: null, recipient_postal_code: null, recipient_city: null,
    billed_address: null,
    payment_reference: null,
    invoice_kind: "STANDARD",
    deposit_deductions: null,
    template_id: template.id,
    template_style: null,
    sections,
    lines,
  };

  const client: ClientWithAddresses = {
    id: 0,
    company_id: company.id,
    client_number: "C0001",
    type: "INDIVIDUAL",
    company_name: null,
    first_name: sample.client.first_name,
    last_name: sample.client.last_name,
    title: sample.client.title,
    email: null,
    phone: null,
    note: null,
    language: language === "EN" ? "EN" : "FR",
    is_active: true,
    is_placeholder: false,
    addresses: [{
      id: 0, company_id: company.id, client_id: 0, is_primary: true, attention: null,
      street: sample.client.street, postal_code: "1950", city: sample.client.city, country: sample.client.country,
    }],
  };

  return { document, client, company, template, style: styleOf(template), deductions: [], amountDue: totals.amount_incl_vat, sample: true };
};
