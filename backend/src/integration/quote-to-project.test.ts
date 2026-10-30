import { beforeAll, describe, expect, it } from "vitest";
import { api, auth, createClient, createCompanyWithAdmin, createDocument, createResource, findProjectsOfQuote, getDocumentComplete, saveContent, sectionOf } from "./helpers";

// Accepting a quote (POST /document/:id/accept) turns it into a chantier: a
// PROJECT document holding the quote's catalog lines, and a projects row on
// top of it - in one transaction, at most once per quote.
describe("accepting a quote", () => {
  let token: string;
  let clientId: number;
  let resourceId: number;

  beforeAll(async () => {
    ({ token } = await createCompanyWithAdmin());
    clientId = (await createClient(token)).id;
    resourceId = (await createResource(token)).id;
  });

  const accept = (quoteId: number) => api().post(`/document/${quoteId}/accept`).set(auth(token));

  it("creates a chantier holding only the quote's catalog lines", async () => {
    const quote = await createDocument(token, "QUOTE", clientId);
    await saveContent(token, quote.id, [
      sectionOf("Cloisons", [
        { label: "Plaque", quantity: 4, unit_price: 20, resource_id: resourceId },
        { label: "Typed by hand", unit_price: 99 },
      ]),
      sectionOf("Only typed lines", [{ label: "Typed by hand too", unit_price: 50 }]),
    ]).expect(200);

    const accepted = await accept(quote.id).expect(200);
    expect(accepted.body.status).toBe("ACCEPTED");

    const projects = await findProjectsOfQuote(token, quote.number);
    expect(projects).toHaveLength(1);
    expect(projects[0]).toMatchObject({ status: "IN_PROGRESS", client_id: clientId });

    const ledger = await getDocumentComplete(token, projects[0].document_id);
    expect(ledger.type).toBe("PROJECT");
    expect(ledger.sections.map((section: { title: string }) => section.title)).toEqual(["Cloisons"]);
    expect(ledger.lines).toHaveLength(1);
    expect(ledger.lines[0]).toMatchObject({ label: "Plaque", quantity: 4, unit_price: 20, resource_id: resourceId });
    expect(ledger.amount_excl_vat).toBe(80);
  });

  it("freezes the accepted quote: no second accept, no edit, no status change", async () => {
    const quote = await createDocument(token, "QUOTE", clientId);
    await accept(quote.id).expect(200);

    await accept(quote.id).expect(409);
    await saveContent(token, quote.id, [sectionOf("Too late", [{}])]).expect(409);
    await api().patch(`/document/${quote.id}/status`).set(auth(token)).send({ status: "REJECTED" }).expect(409);
    expect(await findProjectsOfQuote(token, quote.number)).toHaveLength(1);
  });

  // The status flips first inside the transaction, its DRAFT/SENT check in
  // the UPDATE itself: a concurrent accept waits for the first one, then
  // matches nothing - one quote never spawns two chantiers.
  it("makes one chantier when the same quote is accepted several times at once", async () => {
    const quote = await createDocument(token, "QUOTE", clientId);

    const responses = await Promise.all(Array.from({ length: 5 }, () => accept(quote.id)));

    expect(responses.map(res => res.status).sort()).toEqual([200, 409, 409, 409, 409]);
    expect(await findProjectsOfQuote(token, quote.number)).toHaveLength(1);
  });

  it("doesn't accept a rejected quote, nor an invoice", async () => {
    const quote = await createDocument(token, "QUOTE", clientId);
    await api().patch(`/document/${quote.id}/status`).set(auth(token)).send({ status: "REJECTED" }).expect(200);
    await accept(quote.id).expect(409);

    const invoice = await createDocument(token, "INVOICE", clientId);
    await accept(invoice.id).expect(409);
  });
});
