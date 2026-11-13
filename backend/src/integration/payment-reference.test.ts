import { beforeAll, describe, expect, it } from "vitest";
import { api, auth, createClient, createCompanyWithAdmin, createDocument, saveContent, sectionOf } from "./helpers";
import { isValidCreditorReference, isValidQrReference } from "../pdf/swiss-qr-bill/payment-reference";

// An invoice's QR-bill reference (payment-reference.ts): a creditor
// reference by default, a QR reference with a QR-IBAN, none if the company
// chose so - frozen once the invoice leaves DRAFT, never from a request.
describe("payment references", () => {
  let companyId: number;
  let token: string;
  let clientId: number;

  beforeAll(async () => {
    ({ companyId, token } = await createCompanyWithAdmin());
    clientId = (await createClient(token)).id;
  });

  const settings = (fields: Record<string, unknown>) =>
    api().put(`/company/${companyId}`).set(auth(token)).send({ name: "References Sàrl", vat_rate: 8.1, ...fields });
  const setStatus = (documentId: number, status: string) =>
    api().patch(`/document/${documentId}/status`).set(auth(token)).send({ status });
  const sentInvoice = async () => {
    const invoice = await createDocument(token, "INVOICE", clientId, { payment_reference: "RF18539007547034" });
    await saveContent(token, invoice.id, [sectionOf("Travaux", [{ quantity: 1, unit_price: 100 }])]).expect(200);
    expect(invoice.payment_reference).toBeNull();
    return (await setStatus(invoice.id, "SENT").expect(200)).body;
  };

  it("freezes a creditor reference built from its number when it's sent", async () => {
    await settings({ payment_reference_type: "SCOR", qr_iban: "" }).expect(200);
    const invoice = await sentInvoice();
    expect(isValidCreditorReference(invoice.payment_reference)).toBe(true);
    expect(invoice.payment_reference).toContain(invoice.number.replace(/-/g, ""));
  });

  it("freezes a QR reference with a QR-IBAN", async () => {
    await settings({ qr_iban: "CH44 3199 9123 0008 8901 2" }).expect(200);
    const invoice = await sentInvoice();
    expect(isValidQrReference(invoice.payment_reference)).toBe(true);
    await settings({ qr_iban: "" }).expect(200);
  });

  it("freezes nothing when the company chose no reference", async () => {
    await settings({ payment_reference_type: "NONE" }).expect(200);
    expect((await sentInvoice()).payment_reference).toBeNull();
    await settings({ payment_reference_type: "SCOR" }).expect(200);
  });

  it("keeps the reference it was sent with, whatever the company changes afterwards", async () => {
    const invoice = await sentInvoice();
    await settings({ payment_reference_type: "NONE" }).expect(200);
    const paid = (await setStatus(invoice.id, "PAID").expect(200)).body;
    expect(paid.payment_reference).toBe(invoice.payment_reference);
    await settings({ payment_reference_type: "SCOR" }).expect(200);
  });

  it("gives a quote none", async () => {
    const quote = await createDocument(token, "QUOTE", clientId);
    expect((await setStatus(quote.id, "SENT").expect(200)).body.payment_reference).toBeNull();
  });

  it("only takes a real QR-IBAN as the company's QR-IBAN", async () => {
    const res = await settings({ qr_iban: "CH9300762011623852957" }).expect(400);
    expect(res.body.code).toBe("QR_IBAN_INVALID");
    await settings({ qr_iban: "CH4431999123000889013" }).expect(400);
    await settings({ qr_iban: 5 }).expect(400);
    const saved = (await settings({ qr_iban: "ch44 3199 9123 0008 8901 2" }).expect(200)).body;
    expect(saved.qr_iban).toBe("CH4431999123000889012");
    await settings({ qr_iban: "" }).expect(200);
  });
});
