import { beforeAll, describe, expect, it } from "vitest";
import { api, auth, createClient, createCompanyWithAdmin, createDocument, saveContent, sectionOf } from "./helpers";

// A template's layout (CLASSIC/MODERN) and font (HELVETICA or an embedded
// one): every combination actually prints (the embedded fonts read from
// backend/assets/fonts) - a draft printed with its template as it is now.
describe("a template's layout and font", () => {
  let token: string;
  let quoteId: number;
  let templateId: number;

  beforeAll(async () => {
    ({ token } = await createCompanyWithAdmin());
    const clientId = (await createClient(token)).id;
    const quote = await createDocument(token, "QUOTE", clientId);
    // A label outside Latin-1: an embedded font prints it, Helvetica a "?".
    await saveContent(token, quote.id, [sectionOf("Façade", [{ label: "Peinture ≥ 2 couches", quantity: 3, unit_price: 40 }])]).expect(200);
    quoteId = quote.id;
    templateId = quote.template_id;
  });

  it("prints a quote in every layout and font", async () => {
    for (const layout of ["CLASSIC", "MODERN"]) {
      for (const font of ["HELVETICA", "LATO", "PT_SERIF"]) {
        await api().put(`/template/${templateId}`).set(auth(token)).send({ layout, font, accent_color: "#037a3f" }).expect(200);
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
