import { beforeAll, describe, expect, it } from "vitest";
import { api, auth, createClient, createCompanyWithAdmin, createDocument, createResource, createUser, getDocumentComplete, login, sectionOf, saveContent } from "./helpers";

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

  it("prints a PDF only of a document the employee may read, whatever the URL says", async () => {
    // invoices NONE, quotes READ (previous test): an invoice asked for as a quote.
    await api().get(`/pdf/quote/${invoiceId}`).set(auth(userToken)).expect(403);
    await api().get(`/pdf/reminder/${quoteId}`).set(auth(userToken)).expect(403);
    // Even the admin can't print a document as another type.
    await api().get(`/pdf/quote/${invoiceId}`).set(auth(adminToken)).expect(404);
    await api().get(`/pdf/invoice/${quoteId}`).set(auth(adminToken)).expect(404);
  });

  it("lets the calendar plan a chantier's sections only, never a quote's", async () => {
    await setPermissions({ modules: { invoices: "NONE", quotes: "READ", calendar: "WRITE" } }).expect(200);
    const [section] = (await api().get(`/document-section?document_id=${quoteId}`).set(auth(adminToken)).expect(200)).body;
    await api().patch(`/document-section/${section.id}/note`).set(auth(userToken)).send({ note: "x" }).expect(403);
    await api().put(`/document-section/${section.id}`).set(auth(userToken)).send({ date_start: null, date_end: null }).expect(403);
    await setPermissions({ modules: { invoices: "NONE", quotes: "READ", calendar: "READ" } }).expect(200);
  });

  it("refuses to create a document of any other type than a quote or an invoice", async () => {
    for (const type of ["PROJECT", "constructor", undefined]) {
      await api().post("/document").set(auth(adminToken)).send({ type, client_id: clientId, date: "2026-10-30", discount: 0, vat_rate: 8.1 }).expect(400);
    }
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

// "Voir les prix" off: the modules made of amounts hidden, every price taken
// out of what the others answer, and never taken from what such an employee
// saves - a chantier's lines keep theirs, a new one is priced from the
// catalog or left at 0.
describe("employee permissions without prices", () => {
  let adminToken: string;
  let userToken: string;
  let projectDocumentId: number;
  let resourceId: number;

  beforeAll(async () => {
    const company = await createCompanyWithAdmin();
    adminToken = company.token;
    userToken = await login(await createUser(company.companyId, "USER"));
    const clientId = (await createClient(adminToken)).id;
    resourceId = (await createResource(adminToken, { selling_price: 18.5, purchase_price: 12 })).id;
    const project = (await api().post("/project").set(auth(adminToken)).send({ name: "Toit", client_id: clientId, project_type_id: null }).expect(200)).body;
    projectDocumentId = project.document_id;
    await saveContent(adminToken, projectDocumentId, [sectionOf("Toit", [{ label: "Pose", unit_price: 50, discount: 10 }])]).expect(200);

    const saved = (await api().put("/permissions/employees").set(auth(adminToken))
      .send({ modules: { quotes: "WRITE", invoices: "READ", projects: "WRITE", catalog: "WRITE" }, prices: false }).expect(200)).body;
    expect(saved.modules).toMatchObject({ quotes: "NONE", invoices: "NONE", dashboard: "NONE", projects: "WRITE" });
  });

  it("answers without any price, the admin still with them", async () => {
    const resource = (await api().get("/resource").set(auth(userToken)).expect(200)).body.find((item: { id: number }) => item.id === resourceId);
    expect(resource).toMatchObject({ selling_price: null, purchase_price: null });

    const ledger = await getDocumentComplete(userToken, projectDocumentId);
    expect(ledger.amount_excl_vat).toBeNull();
    expect(ledger.lines[0]).toMatchObject({ label: "Pose", unit_price: null, discount: null });
    expect(Number((await getDocumentComplete(adminToken, projectDocumentId)).lines[0].unit_price)).toBe(50);

    await api().get("/document?type=QUOTE").set(auth(userToken)).expect(403);
  });

  it("keeps a chantier line's price, prices a new one from the catalog or at 0", async () => {
    const [line] = (await getDocumentComplete(adminToken, projectDocumentId)).lines;
    await saveContent(userToken, projectDocumentId, [sectionOf("Toit", [
      { id: line.id, label: "Pose", quantity: 3, unit_price: null },
      { label: "Tuile", resource_id: resourceId, unit_price: 1 },
      { label: "Typed", unit_price: 999, discount: 50 },
    ])]).expect(200);

    const lines = (await getDocumentComplete(adminToken, projectDocumentId)).lines;
    expect(lines.map((item: { label: string; quantity: string; unit_price: string; discount: string }) =>
      [item.label, Number(item.quantity), Number(item.unit_price), Number(item.discount)]))
      .toEqual([["Pose", 3, 50, 10], ["Tuile", 1, 18.5, 0], ["Typed", 1, 0, 0]]);
  });

  it("keeps a resource's prices when such an employee edits it, creates one unpriced", async () => {
    await api().put(`/resource/${resourceId}`).set(auth(userToken))
      .send({ name: "Tuile rouge", unit: "pce", selling_price: 1, purchase_price: 1, reference: null }).expect(200);
    const resource = (await api().get("/resource").set(auth(adminToken)).expect(200)).body.find((item: { id: number }) => item.id === resourceId);
    expect([resource.name, Number(resource.selling_price), Number(resource.purchase_price)]).toEqual(["Tuile rouge", 18.5, 12]);

    const created = (await api().post("/resource").set(auth(userToken))
      .send({ type: "MATERIAL", name: "Clou", unit: "pce", selling_price: 99, purchase_price: 50, parent_resource_id: null }).expect(200)).body;
    const stored = (await api().get("/resource").set(auth(adminToken)).expect(200)).body.find((item: { id: number }) => item.id === created.id);
    expect([Number(stored.selling_price), stored.purchase_price]).toEqual([0, null]);
  });
});
