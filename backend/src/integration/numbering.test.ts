import { beforeAll, describe, expect, it } from "vitest";
import { api, auth, createClient, createCompanyWithAdmin, createDocument, createUser, login, postDocument } from "./helpers";

// A company's own numbering (Paramètres > Numérotation) of its quotes,
// invoices, clients and resources: its format and the number it continues
// from, an admin's to change, checked, never giving out a number twice -
// concurrent creations included - and its own company's only.
describe("document numbering", () => {
  const year = new Date().getFullYear();
  const shortYear = String(year % 100).padStart(2, "0");
  let companyId: number;
  let token: string;
  let clientId: number;

  beforeAll(async () => {
    ({ companyId, token } = await createCompanyWithAdmin());
    clientId = (await createClient(token)).id;
  });

  const setNumbering = (type: string, body: Record<string, unknown>, as = token) =>
    api().put(`/numbering/${type}`).set(auth(as)).send(body);

  it("numbers with the default formats until a company sets its own", async () => {
    const settings = (await api().get("/numbering").set(auth(token)).expect(200)).body;
    expect(settings).toEqual([
      { type: "QUOTE", number_format: "OFF-{YYYY}-{NNNN}", start_number: null, next_number: `OFF-${year}-0001` },
      { type: "INVOICE", number_format: "FAC-{YYYY}-{NNNN}", start_number: null, next_number: `FAC-${year}-0001` },
      // createClient in beforeAll took C0001.
      { type: "CLIENT", number_format: "C{NNNN}", start_number: null, next_number: "C0002" },
      { type: "MATERIAL", number_format: "MAT{NNNN}", start_number: null, next_number: "MAT0001" },
      { type: "SERVICE", number_format: "SER{NNNN}", start_number: null, next_number: "SER0001" },
    ]);
    expect((await createDocument(token, "QUOTE", clientId)).number).toBe(`OFF-${year}-0001`);
  });

  it("continues from the number a company starts at, in its own format", async () => {
    const saved = (await setNumbering("INVOICE", { number_format: "F{YY}/{NNN}", start_number: 120 }).expect(200)).body;
    expect(saved.next_number).toBe(`F${shortYear}/120`);

    expect((await createDocument(token, "INVOICE", clientId)).number).toBe(`F${shortYear}/120`);
    expect((await createDocument(token, "INVOICE", clientId)).number).toBe(`F${shortYear}/121`);
    // The quotes keep theirs.
    expect((await createDocument(token, "QUOTE", clientId)).number).toBe(`OFF-${year}-0002`);
  });

  it("never goes back below a number already given out", async () => {
    await setNumbering("INVOICE", { number_format: "F{YY}/{NNN}", start_number: 5 }).expect(200);
    expect((await createDocument(token, "INVOICE", clientId)).number).toBe(`F${shortYear}/122`);
  });

  it("gives out distinct numbers to invoices created at once", async () => {
    const responses = await Promise.all(Array.from({ length: 6 }, () => postDocument(token, "INVOICE", clientId)));
    expect(responses.map(res => res.status)).toEqual([200, 200, 200, 200, 200, 200]);
    expect(new Set(responses.map(res => res.body.number)).size).toBe(6);
  });

  it("previews the next number without saving anything", async () => {
    const preview = (await api().post("/numbering/QUOTE/preview").set(auth(token)).send({ number_format: "D-{NNNNN}", start_number: 3000 }).expect(200)).body;
    expect(preview.next_number).toBe("D-03000");
    const settings = (await api().get("/numbering").set(auth(token)).expect(200)).body;
    expect(settings[0].number_format).toBe("OFF-{YYYY}-{NNNN}");
  });

  it("refuses a format without a sequence, with odd characters, or another type's", async () => {
    expect((await setNumbering("QUOTE", { number_format: "OFF-{YYYY}" }).expect(400)).body.code).toBe("NUMBER_FORMAT_NO_SEQUENCE");
    expect((await setNumbering("QUOTE", { number_format: "OFF {NNNN}" }).expect(400)).body.code).toBe("NUMBER_FORMAT_INVALID_CHARACTERS");
    expect((await setNumbering("QUOTE", { number_format: "F{YY}/{NNN}" }).expect(400)).body.code).toBe("NUMBER_FORMAT_TAKEN");
    expect((await setNumbering("QUOTE", { number_format: "CH-{YYYY}-{NNNN}" }).expect(400)).body.code).toBe("NUMBER_FORMAT_TAKEN");
    expect((await setNumbering("QUOTE", { number_format: "D-{NNNN}", start_number: 0 }).expect(400)).body.code).toBe("NUMBER_START_INVALID");
    await setNumbering("PROJECT", { number_format: "P-{NNNN}" }).expect(400);
  });

  it("is an admin's to change, its own company's only", async () => {
    const userToken = await login(await createUser(companyId, "USER"));
    await setNumbering("QUOTE", { number_format: "D-{NNNN}" }, userToken).expect(403);
    await api().get("/numbering").set(auth(userToken)).expect(200);

    const other = await createCompanyWithAdmin();
    const otherClient = (await createClient(other.token)).id;
    expect((await createDocument(other.token, "INVOICE", otherClient)).number).toBe(`FAC-${year}-0001`);
  });
});
