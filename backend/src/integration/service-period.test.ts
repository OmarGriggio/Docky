import { beforeAll, describe, expect, it } from "vitest";
import { api, auth, createClient, createCompanyWithAdmin, createDocument, postDocument } from "./helpers";

// An invoice's service date or period (art. 26 LTVA): set while it's a
// draft, checked, kept when a save leaves it out, none on a quote.
describe("an invoice's service period", () => {
  let token: string;
  let clientId: number;

  beforeAll(async () => {
    ({ token } = await createCompanyWithAdmin());
    clientId = (await createClient(token)).id;
  });

  // A DATE comes back as midnight in the server's time zone - read its day there.
  const dayOf = (value: string | null) => {
    if (!value) {
      return null;
    }
    const date = new Date(value);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  };
  const periodOf = async (id: number) => {
    const document = (await api().get(`/document/${id}`).set(auth(token)).expect(200)).body;
    return [dayOf(document.service_date_start), dayOf(document.service_date_end)];
  };
  const headerOf = (fields: Record<string, unknown> = {}) => ({
    client_id: clientId, address_id: null, reference_client: null, date: "2026-11-26", discount: 0, vat_rate: 8.1,
    introduction: "", conclusion: "", payment_terms: "", due_date: null, ...fields,
  });

  it("stores a period, a single date, and keeps it when a save leaves it out", async () => {
    const invoice = await createDocument(token, "INVOICE", clientId, { service_date_start: "2026-11-02", service_date_end: "2026-11-13" });
    expect(await periodOf(invoice.id)).toEqual(["2026-11-02", "2026-11-13"]);

    await api().put(`/document/${invoice.id}`).set(auth(token)).send(headerOf()).expect(200);
    expect(await periodOf(invoice.id)).toEqual(["2026-11-02", "2026-11-13"]);

    await api().put(`/document/${invoice.id}`).set(auth(token)).send(headerOf({ service_date_start: null, service_date_end: "2026-11-20" })).expect(200);
    expect(await periodOf(invoice.id)).toEqual(["2026-11-20", null]);
  });

  it("refuses a period ending before it starts, or what isn't a date", async () => {
    const reversed = await postDocument(token, "INVOICE", clientId, { service_date_start: "2026-11-13", service_date_end: "2026-11-02" }).expect(400);
    expect(reversed.body.code).toBe("SERVICE_PERIOD_INVALID");
    const invalid = await postDocument(token, "INVOICE", clientId, { service_date_start: "13.11.2026" }).expect(400);
    expect(invalid.body.code).toBe("SERVICE_DATE_INVALID");
  });

  it("gives a quote none", async () => {
    const quote = await createDocument(token, "QUOTE", clientId, { service_date_start: "2026-11-02" });
    expect(await periodOf(quote.id)).toEqual([null, null]);
  });

  it("can't change once the invoice is sent", async () => {
    const invoice = await createDocument(token, "INVOICE", clientId, { service_date_start: "2026-11-02" });
    await api().patch(`/document/${invoice.id}/status`).set(auth(token)).send({ status: "SENT" }).expect(200);
    await api().put(`/document/${invoice.id}`).set(auth(token)).send(headerOf({ service_date_start: "2026-10-01" })).expect(409);
    expect(await periodOf(invoice.id)).toEqual(["2026-11-02", null]);
  });
});
