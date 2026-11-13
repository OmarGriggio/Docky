import { describe, expect, it } from "vitest";
import { completeDebtorOrNull, paymentReferenceFor, paymentReferenceOf, qrIbanOf } from "./swiss-qr-bill.dto";
import { QrBillDebtor } from "../../swiss-qr-bill/swiss-qr-bill.types";

const debtor: QrBillDebtor = {
  name: "Hôtel du Cervin SA", street: "Bahnhofstrasse 5", buildingNumber: "", postalCode: "3920", town: "Zermatt", country: "CH",
};

describe("completeDebtorOrNull", () => {
  it("keeps a payer the structured address can hold, trimmed", () => {
    expect(completeDebtorOrNull({ ...debtor, name: " Hôtel du Cervin SA " })).toEqual(debtor);
  });

  it("takes an address without a country as a Swiss one", () => {
    expect(completeDebtorOrNull({ ...debtor, country: "" })?.country).toBe("CH");
  });

  it("leaves the payer blank without a postcode or town - a client with no address yet", () => {
    expect(completeDebtorOrNull({ ...debtor, postalCode: "", town: "" })).toBeNull();
    expect(completeDebtorOrNull({ ...debtor, town: " " })).toBeNull();
  });

  it("leaves the payer blank rather than failing the invoice when a field is too long for it", () => {
    expect(completeDebtorOrNull({ ...debtor, town: "Crans-Montana (Chermignon-d'en-Haut) VS" })).toBeNull();
    expect(completeDebtorOrNull({ ...debtor, postalCode: "1".repeat(17) })).toBeNull();
    expect(completeDebtorOrNull({ ...debtor, country: "Royaume-Uni" })).toBeNull();
  });
});

describe("payment reference of an invoice", () => {
  const company = { iban: "CH9300762011623852957", qr_iban: null, payment_reference_type: "SCOR" as const };

  it("takes the QR-IBAN from its own field, or from the IBAN when that's one", () => {
    expect(qrIbanOf(company)).toBe("");
    expect(qrIbanOf({ ...company, qr_iban: "CH44 3199 9123 0008 8901 2" })).toBe("CH4431999123000889012");
    expect(qrIbanOf({ iban: "CH4431999123000889012", qr_iban: null })).toBe("CH4431999123000889012");
  });

  it("follows the company's settings", () => {
    expect(paymentReferenceFor(company, "FAC-2026-0012").type).toBe("SCOR");
    expect(paymentReferenceFor({ ...company, payment_reference_type: "NONE" }, "FAC-2026-0012").type).toBe("NON");
    expect(paymentReferenceFor({ ...company, payment_reference_type: "NONE", qr_iban: "CH4431999123000889012" }, "FAC-2026-0012").type).toBe("QRR");
  });

  it("is the company's while a draft, the frozen one once sent - none for one sent without", () => {
    const draft = { status: "DRAFT" as const, number: "FAC-2026-0012", payment_reference: null };
    expect(paymentReferenceOf(draft, company).type).toBe("SCOR");
    expect(paymentReferenceOf({ ...draft, status: "SENT" }, company)).toEqual({ type: "NON", value: "" });
    expect(paymentReferenceOf({ ...draft, status: "PAID", payment_reference: "RF18539007547034" }, company))
      .toEqual({ type: "SCOR", value: "RF18539007547034" });
  });
});
