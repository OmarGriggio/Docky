import { beforeAll, describe, expect, it } from "vitest";
import { api, auth, createClient, createCompanyWithAdmin, createDocument, createUser, login, sectionOf, saveContent } from "./helpers";

// What a company's employees (USER) may do, set by its admin (Paramètres >
// Droits des employés): a module hidden is a 403 on its routes, a module in
// read only refuses every change, a list without a type only returns what's
// readable - and the admin, or a company without settings, isn't bound.
describe("employee permissions", () => {
  let companyId: number;
  let adminToken: string;
  let userToken: string;
  let clientId: number;
  let quoteId: number;
  let invoiceId: number;

  beforeAll(async () => {
    ({ companyId, token: adminToken } = await createCompanyWithAdmin());
    userToken = await login(await createUser(companyId, "USER"));
    clientId = (await createClient(adminToken)).id;
    quoteId = (await createDocument(adminToken, "QUOTE", clientId)).id;
    invoiceId = (await createDocument(adminToken, "INVOICE", clientId)).id;
    await saveContent(adminToken, quoteId, [sectionOf("Façade", [{}])]).expect(200);
  });

  const setPermissions = (body: object | string, token = adminToken) =>
    api().put("/permissions/employees").set(auth(token)).send(body);

  it("lets an employee do what they always could until the admin sets anything", async () => {
    const mine = (await api().get("/permissions/me").set(auth(userToken)).expect(200)).body;
    expect(mine.modules.invoices).toBe("WRITE");
    expect(mine.prices).toBe(true);
    await api().get(`/document/${invoiceId}`).set(auth(userToken)).expect(200);
    // The dashboard and the calendar were an admin's before permissions existed.
    await api().get("/dashboard/open-invoices").set(auth(userToken)).expect(403);
    await api().get("/calendar-note").set(auth(userToken)).expect(403);
    expect((await api().get("/permissions/me").set(auth(adminToken)).expect(200)).body.modules.dashboard).toBe("WRITE");
  });

  it("is the admin's to set, not an employee's", async () => {
    await setPermissions({ modules: { invoices: "NONE" } }, userToken).expect(403);
    await api().get("/permissions/employees").set(auth(userToken)).expect(403);
  });

  it("hides a module: its routes are a 403, its documents left out of a list", async () => {
    const saved = (await setPermissions({ modules: { invoices: "NONE", quotes: "READ", calendar: "READ" } }).expect(200)).body;
    expect(saved.modules).toMatchObject({ invoices: "NONE", quotes: "READ", clients: "WRITE" });

    await api().get(`/document/${invoiceId}`).set(auth(userToken)).expect(403);
    await api().get("/document?type=INVOICE").set(auth(userToken)).expect(403);
    await api().get(`/pdf/invoice/${invoiceId}`).set(auth(userToken)).expect(403);
    await api().get("/dashboard/open-invoices").set(auth(userToken)).expect(403);

    const all = (await api().get("/document").set(auth(userToken)).expect(200)).body as { type: string }[];
    expect(all.some(document => document.type === "INVOICE")).toBe(false);
    expect(all.some(document => document.type === "QUOTE")).toBe(true);
  });

  it("keeps a module in read only: shown, nothing changed", async () => {
    await api().get(`/document/${quoteId}`).set(auth(userToken)).expect(200);
    await api().get(`/document-section?document_id=${quoteId}`).set(auth(userToken)).expect(200);
    await api().put(`/document/${quoteId}/content`).set(auth(userToken)).send({ sections: [] }).expect(403);
    await api().patch(`/document/${quoteId}/status`).set(auth(userToken)).send({ status: "SENT" }).expect(403);
    await api().post("/document").set(auth(userToken)).send({ type: "QUOTE", client_id: clientId }).expect(403);
    await api().post("/calendar-note").set(auth(userToken)).send({}).expect(403);
    await api().get("/calendar-note").set(auth(userToken)).expect(200);
  });

  it("still shows a client's name to a module that needs it", async () => {
    await setPermissions({ modules: { clients: "NONE", quotes: "READ" } }).expect(200);
    await api().get("/client").set(auth(userToken)).expect(200);
    await api().post("/client").set(auth(userToken)).send({ type: "PROFESSIONAL", company_name: "X" }).expect(403);
  });

  it("doesn't bind the admin, nor another company's employees", async () => {
    await setPermissions({ modules: { invoices: "NONE" } }).expect(200);
    await api().get(`/document/${invoiceId}`).set(auth(adminToken)).expect(200);

    const other = await createCompanyWithAdmin();
    const otherUser = await login(await createUser(other.companyId, "USER"));
    const mine = (await api().get("/permissions/me").set(auth(otherUser)).expect(200)).body;
    expect(mine.modules.invoices).toBe("WRITE");
  });

  it("refuses settings that aren't an object", async () => {
    await setPermissions("WRITE").expect(400);
  });
});
