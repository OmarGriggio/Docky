import { beforeAll, describe, expect, it } from "vitest";
import { createClient, createCompanyWithAdmin, createDocument, createResource, getDocumentComplete, saveContent, sectionOf } from "./helpers";

// PUT /document/:id/content replaces a document's whole content in one
// transaction and recomputes its stored totals once.
describe("saving a document's content", () => {
  let token: string;
  let clientId: number;

  beforeAll(async () => {
    ({ token } = await createCompanyWithAdmin());
    clientId = (await createClient(token)).id;
  });

  const sectionTitles = (document: { sections: { title: string }[] }) => document.sections.map(section => section.title);

  it("stores the totals the form and the PDF show: each line rounded first, then discount and VAT", async () => {
    const quote = await createDocument(token, "QUOTE", clientId, { discount: 5, vat_rate: 8.1 });

    const res = await saveContent(token, quote.id, [
      sectionOf("Pos 1", [{ quantity: 3, unit_price: 12.35 }]),
      // 2.5 × 19.99 = 49.975, 10 % off = 44.9775 → 44.98
      sectionOf("Pos 2", [{ type: "SERVICE", quantity: 2.5, unit: "h", unit_price: 19.99, discount: 10 }]),
    ]).expect(200);

    // 37.05 + 44.98 = 82.03, 5 % off = 77.93, + 8.1 % VAT = 84.24
    expect(res.body.amount_excl_vat).toBe(77.93);
    expect(res.body.amount_incl_vat).toBe(84.24);
  });

  it("replaces the previous content instead of adding to it", async () => {
    const quote = await createDocument(token, "QUOTE", clientId, { vat_rate: 0 });
    await saveContent(token, quote.id, [sectionOf("First", [{}, {}])]).expect(200);
    await saveContent(token, quote.id, [sectionOf("Second", [{ unit_price: 7 }])]).expect(200);

    const document = await getDocumentComplete(token, quote.id);
    expect(sectionTitles(document)).toEqual(["Second"]);
    expect(document.lines).toHaveLength(1);
    expect(document.amount_excl_vat).toBe(7);
  });

  it("refuses an invalid line and keeps what was there", async () => {
    const quote = await createDocument(token, "QUOTE", clientId, { vat_rate: 0 });
    await saveContent(token, quote.id, [sectionOf("Kept", [{ unit_price: 15 }])]).expect(200);

    await saveContent(token, quote.id, [sectionOf("Bad", [{ type: "LABOR" }])]).expect(400);
    await saveContent(token, quote.id, [sectionOf("Bad", [{ discount: 150 }])]).expect(400);
    await saveContent(token, quote.id, [sectionOf("  ", [{}])]).expect(400);

    const document = await getDocumentComplete(token, quote.id);
    expect(sectionTitles(document)).toEqual(["Kept"]);
    expect(document.amount_excl_vat).toBe(15);
  });

  // Checked inside the transaction, after the old content is locked: the
  // whole save rolls back, nothing half-written.
  it("refuses another company's resource and keeps what was there", async () => {
    const { token: otherToken } = await createCompanyWithAdmin();
    const foreignResource = await createResource(otherToken);
    const quote = await createDocument(token, "QUOTE", clientId, { vat_rate: 0 });
    await saveContent(token, quote.id, [sectionOf("Kept", [{ unit_price: 15 }])]).expect(200);

    await saveContent(token, quote.id, [
      sectionOf("New", [{ unit_price: 1 }]),
      sectionOf("Foreign", [{ resource_id: foreignResource.id }]),
    ]).expect(404);

    expect(sectionTitles(await getDocumentComplete(token, quote.id))).toEqual(["Kept"]);
  });

  // A repository querying `pool` instead of db() inside a transaction held
  // that transaction's connection while waiting for a second one: as many
  // concurrent saves as the pool has connections (10) and every one of them
  // waited forever.
  it("handles more concurrent saves than the pool has connections", async () => {
    const resource = await createResource(token);
    const quotes = await Promise.all(Array.from({ length: 12 }, () => createDocument(token, "QUOTE", clientId, { vat_rate: 0 })));

    const responses = await Promise.all(quotes.map((quote, i) =>
      saveContent(token, quote.id, [sectionOf("Pos 1", [{ quantity: i + 1, resource_id: resource.id }])])
    ));

    expect(responses.map(res => res.status)).toEqual(quotes.map(() => 200));
    expect(responses.map(res => res.body.amount_excl_vat)).toEqual(quotes.map((_, i) => (i + 1) * 10));
  }, 30000);

  // The document is locked for the whole save: concurrent saves of it take
  // turns, each replacing the last one whole - never two saves' lines mixed.
  it("keeps one save's content whole when the same document is saved several times at once", async () => {
    const quote = await createDocument(token, "QUOTE", clientId, { vat_rate: 0 });

    const responses = await Promise.all(Array.from({ length: 8 }, (_, i) =>
      saveContent(token, quote.id, [sectionOf(`Save ${i}`, [{}, {}])])
    ));

    expect(responses.map(res => res.status)).toEqual(responses.map(() => 200));
    const document = await getDocumentComplete(token, quote.id);
    expect(document.sections).toHaveLength(1);
    expect(document.lines).toHaveLength(2);
    expect(document.amount_excl_vat).toBe(20);
  }, 30000);
});
