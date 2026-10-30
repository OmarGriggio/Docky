import { beforeAll, describe, expect, it } from "vitest";
import { api, auth, createClient, createCompanyWithAdmin, createDocument, createResource, findProjectsOfQuote, postDocument, saveContent, sectionOf } from "./helpers";

// An invoice goes forward only (DRAFT → SENT → PAID or CANCELLED), is frozen
// once sent, and a completed chantier is invoiced once - unless that invoice
// was cancelled.
describe("invoice lifecycle", () => {
  let token: string;
  let clientId: number;

  beforeAll(async () => {
    ({ token } = await createCompanyWithAdmin());
    clientId = (await createClient(token)).id;
  });

  const setStatus = (documentId: number, status: string) =>
    api().patch(`/document/${documentId}/status`).set(auth(token)).send({ status });

  it("always starts as an active draft numbered by the server, whatever the body says", async () => {
    const invoice = await createDocument(token, "INVOICE", clientId, {
      status: "PAID",
      number: "FAC-1999-0001",
      is_active: false,
      amount_excl_vat: 1000,
    });

    expect(invoice).toMatchObject({ status: "DRAFT", is_active: true, amount_excl_vat: 0 });
    expect(invoice.number).toMatch(/^FAC-\d{4}-\d{4}$/);
  });

  // Two at once used to read the same last number, the second insert
  // hitting UNIQUE (company_id, number): a 500.
  it("numbers documents created at the same moment one after the other", async () => {
    const invoices = await Promise.all(Array.from({ length: 6 }, () => createDocument(token, "INVOICE", clientId)));

    const sequences = invoices.map(invoice => Number(invoice.number.slice(-4))).sort((a, b) => a - b);
    expect(sequences).toEqual(sequences.map((_, i) => sequences[0] + i));
  });

  it("goes forward only, and is frozen once sent", async () => {
    const invoice = await createDocument(token, "INVOICE", clientId);
    await saveContent(token, invoice.id, [sectionOf("Pos 1", [{}])]).expect(200);

    await setStatus(invoice.id, "SENT").expect(200);
    await setStatus(invoice.id, "DRAFT").expect(409);
    await saveContent(token, invoice.id, [sectionOf("Rewritten", [{ unit_price: 1 }])]).expect(409);

    await setStatus(invoice.id, "PAID").expect(200);
    await setStatus(invoice.id, "CANCELLED").expect(409);
  });

  // A chantier accepted from a quote with one catalog line.
  const createProject = async () => {
    const resource = await createResource(token);
    const quote = await createDocument(token, "QUOTE", clientId);
    await saveContent(token, quote.id, [sectionOf("Pos 1", [{ resource_id: resource.id }])]).expect(200);
    await api().post(`/document/${quote.id}/accept`).set(auth(token)).expect(200);
    const [project] = await findProjectsOfQuote(token, quote.number);
    return { project, resource };
  };

  it("invoices a chantier once it's completed, and only once - unless that invoice is cancelled", async () => {
    const { project, resource } = await createProject();
    const forProject = { parent_document_id: project.document_id };

    // Still in progress: its quantities aren't final yet.
    await postDocument(token, "INVOICE", clientId, forProject).expect(409);

    await api().patch(`/project/${project.id}/complete`).set(auth(token)).expect(200);
    // Its ledger is what the invoice is built from - frozen now.
    await saveContent(token, project.document_id, [sectionOf("Changed", [{ resource_id: resource.id }])]).expect(409);

    const first = await createDocument(token, "INVOICE", clientId, forProject);
    await postDocument(token, "INVOICE", clientId, forProject).expect(409);

    // Archiving tidies a list, it doesn't undo an invoice.
    await api().patch(`/document/${first.id}/archive`).set(auth(token)).expect(200);
    await postDocument(token, "INVOICE", clientId, forProject).expect(409);

    await api().patch(`/document/${first.id}/unarchive`).set(auth(token)).expect(200);
    await setStatus(first.id, "CANCELLED").expect(200);
    await postDocument(token, "INVOICE", clientId, forProject).expect(200);
  });

  // The "already invoiced" check runs under the numbering lock: a double
  // click on "Facturer" waits for the first invoice, then sees it.
  it("invoices a chantier once when it's invoiced twice at the same moment", async () => {
    const { project } = await createProject();
    await api().patch(`/project/${project.id}/complete`).set(auth(token)).expect(200);

    const responses = await Promise.all(Array.from({ length: 3 }, () =>
      postDocument(token, "INVOICE", clientId, { parent_document_id: project.document_id })
    ));

    expect(responses.map(res => res.status).sort()).toEqual([200, 409, 409]);
  });
});
