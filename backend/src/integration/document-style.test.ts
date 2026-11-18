import { beforeAll, describe, expect, it } from "vitest";
import { api, auth, createClient, createCompanyWithAdmin, createDocument, saveContent, sectionOf } from "./helpers";

// The company's document template: its layout (CLASSIC/MODERN) and font
// (HELVETICA or an embedded one) - stored as chosen, anything unknown as the
// default, kept when a save leaves them out - and every combination actually
// prints (the embedded fonts read from backend/assets/fonts).
describe("the company's document template", () => {
  let companyId: number;
  let token: string;
  let quoteId: number;

  beforeAll(async () => {
    ({ companyId, token } = await createCompanyWithAdmin());
    const clientId = (await createClient(token)).id;
    const quote = await createDocument(token, "QUOTE", clientId);
    // A label outside Latin-1: an embedded font prints it, Helvetica a "?".
    await saveContent(token, quote.id, [sectionOf("Façade", [{ label: "Peinture ≥ 2 couches", quantity: 3, unit_price: 40 }])]).expect(200);
    quoteId = quote.id;
  });

  const update = (fields: Record<string, unknown>) =>
    api().put(`/company/${companyId}`).set(auth(token)).send({ name: "Style Sàrl", vat_rate: 8.1, ...fields });

  it("stores the layout and font chosen, and the defaults for anything else", async () => {
    const saved = (await update({ document_layout: "MODERN", document_font: "PT_SERIF" }).expect(200)).body;
    expect(saved).toMatchObject({ document_layout: "MODERN", document_font: "PT_SERIF" });

    const unknown = (await update({ document_layout: "FANCY", document_font: "Comic Sans" }).expect(200)).body;
    expect(unknown).toMatchObject({ document_layout: "CLASSIC", document_font: "HELVETICA" });
  });

  it("keeps them when a save leaves them out", async () => {
    await update({ document_layout: "MODERN", document_font: "LATO" }).expect(200);
    const saved = (await update({}).expect(200)).body;
    expect(saved).toMatchObject({ document_layout: "MODERN", document_font: "LATO" });
  });

  it("prints a quote in every layout and font", async () => {
    for (const document_layout of ["CLASSIC", "MODERN"]) {
      for (const document_font of ["HELVETICA", "LATO", "PT_SERIF"]) {
        await update({ document_layout, document_font }).expect(200);
        const pdf = await api().get(`/pdf/quote/${quoteId}`).set(auth(token)).buffer(true).parse((res, done) => {
          const chunks: Buffer[] = [];
          res.on("data", (chunk: Buffer) => chunks.push(chunk));
          res.on("end", () => done(null, Buffer.concat(chunks)));
        }).expect(200);
        expect((pdf.body as Buffer).subarray(0, 5).toString()).toBe("%PDF-");
      }
    }
  });
});
