import { beforeAll, describe, expect, it } from "vitest";
import { api, auth, createClient, createCompanyWithAdmin, createDocument, createUser, login, postDocument } from "./helpers";

// Document templates (modules/templates): several per company, one default,
// managed by its admin; a document is given one (the default without one),
// an invoice copies its early payment discount, and a document sent keeps
// the look it was sent with whatever its template becomes.
describe("document templates", () => {
  let companyId: number;
  let token: string;
  let clientId: number;
  let standardId: number;

  beforeAll(async () => {
    ({ companyId, token } = await createCompanyWithAdmin());
    clientId = (await createClient(token)).id;
  });

  const list = async () => (await api().get("/template").set(auth(token)).expect(200)).body;
  const create = (fields: Record<string, unknown>) => api().post("/template").set(auth(token)).send(fields);
  const update = (id: number, fields: Record<string, unknown>) => api().put(`/template/${id}`).set(auth(token)).send(fields);
  const setStatus = (id: number, status: string) => api().patch(`/document/${id}/status`).set(auth(token)).send({ status });
  const getDocument = async (id: number) => (await api().get(`/document/${id}`).set(auth(token)).expect(200)).body;

  it("gives a company without any its Standard default template", async () => {
    const templates = await list();
    expect(templates).toHaveLength(1);
    expect(templates[0]).toMatchObject({ name: "Standard", is_default: true, layout: "CLASSIC", font: "HELVETICA" });
    standardId = templates[0].id;
  });

  it("stores colors lowercase, unknown layouts and fonts as the defaults, and refuses what can't be printed", async () => {
    const saved = (await update(standardId, { palette: [{ name: "Or", color: "#B8860B" }], element_colors: { title: 1, total: 2, oops: 1 }, layout: "FANCY", font: "Comic Sans" }).expect(200)).body;
    expect(saved).toMatchObject({ palette: [{ name: "Or", color: "#b8860b" }], element_colors: { title: 1 }, layout: "CLASSIC", font: "HELVETICA" });

    await update(standardId, { palette: [{ color: "#fff" }] }).expect(400);
    await update(standardId, { palette: [{ color: 5 }] }).expect(400);
    await update(standardId, { name: "" }).expect(400);
    await update(standardId, { early_payment_discount: 2 }).expect(400); // no days
    await update(standardId, { quote_due_days: -1 }).expect(400);
  });

  it("keeps what a save leaves out", async () => {
    await update(standardId, { layout: "MODERN", payment_terms: "30 jours net" }).expect(200);
    const saved = (await update(standardId, { name: "Standard" }).expect(200)).body;
    expect(saved).toMatchObject({ layout: "MODERN", payment_terms: "30 jours net", palette: [{ name: "Or", color: "#b8860b" }] });
  });

  it("has exactly one default, which can't be archived", async () => {
    const other = (await create({ name: "Rénovation", early_payment_discount: 2, early_payment_days: 10 }).expect(200)).body;
    expect(other.is_default).toBe(false);
    await api().patch(`/template/${standardId}/archive`).set(auth(token)).expect(409);

    await api().patch(`/template/${other.id}/default`).set(auth(token)).expect(200);
    const defaults = (await list()).filter((template: { is_default: boolean }) => template.is_default);
    expect(defaults.map((template: { id: number }) => template.id)).toEqual([other.id]);

    await api().patch(`/template/${standardId}/default`).set(auth(token)).expect(200);
    expect((await list()).find((template: { is_default: boolean }) => template.is_default).id).toBe(standardId);
  });

  it("duplicates a template under a new name, never as the default", async () => {
    const copy = (await api().post(`/template/${standardId}/duplicate`).set(auth(token)).send({ name: "Copie" }).expect(200)).body;
    expect(copy).toMatchObject({ name: "Copie", is_default: false, layout: "MODERN", palette: [{ name: "Or", color: "#b8860b" }], payment_terms: "30 jours net" });
  });

  it("gives a new document the default template, or the one asked for, with its early payment discount", async () => {
    const plain = await createDocument(token, "INVOICE", clientId);
    expect(plain).toMatchObject({ template_id: standardId, early_payment_discount: 0 });

    const renovation = (await list()).find((template: { name: string }) => template.name === "Rénovation");
    const invoice = await createDocument(token, "INVOICE", clientId, { template_id: renovation.id, early_payment_discount: 50 });
    expect(invoice).toMatchObject({ template_id: renovation.id, early_payment_discount: 2, early_payment_days: 10 });

    const quote = await createDocument(token, "QUOTE", clientId, { template_id: renovation.id });
    expect(quote).toMatchObject({ template_id: renovation.id, early_payment_discount: 0 });
  });

  it("refuses an archived template or another company's for a document", async () => {
    const archived = (await create({ name: "Ancien" }).expect(200)).body;
    await api().patch(`/template/${archived.id}/archive`).set(auth(token)).expect(200);
    await postDocument(token, "QUOTE", clientId, { template_id: archived.id }).expect(404);

    const other = await createCompanyWithAdmin();
    const foreign = (await api().get("/template").set(auth(other.token)).expect(200)).body[0];
    await postDocument(token, "QUOTE", clientId, { template_id: foreign.id }).expect(404);
    await api().get(`/template/${foreign.id}`).set(auth(token)).expect(404);
    await api().put(`/template/${foreign.id}`).set(auth(token)).send({ name: "Volé" }).expect(404);
  });

  it("changes a draft invoice's template and early payment discount, keeps the discount on any other edit", async () => {
    const invoice = await createDocument(token, "INVOICE", clientId);
    const renovation = (await list()).find((template: { name: string }) => template.name === "Rénovation");
    const body = { ...(await getDocument(invoice.id)), template_id: renovation.id };
    const changed = (await api().put(`/document/${invoice.id}`).set(auth(token)).send(body).expect(200)).body;
    expect(changed).toMatchObject({ template_id: renovation.id, early_payment_discount: 2 });

    const { template_id: _, ...withoutTemplate } = { ...changed, reference_client: "R-1" };
    const edited = (await api().put(`/document/${invoice.id}`).set(auth(token)).send(withoutTemplate).expect(200)).body;
    expect(edited).toMatchObject({ template_id: renovation.id, early_payment_discount: 2, reference_client: "R-1" });
  });

  it("freezes a document's look when it's sent, a draft following its template", async () => {
    const draft = await createDocument(token, "QUOTE", clientId);
    const sent = await createDocument(token, "QUOTE", clientId);
    await setStatus(sent.id, "SENT").expect(200);
    expect((await getDocument(sent.id)).template_style).toMatchObject({ layout: "MODERN", palette: [{ name: "Or", color: "#b8860b" }], element_colors: { title: 1 } });
    expect((await getDocument(draft.id)).template_style).toBeNull();

    // Back to DRAFT: it follows its template again.
    await setStatus(sent.id, "DRAFT").expect(200);
    expect((await getDocument(sent.id)).template_style).toBeNull();
  });

  it("is managed by the company's admin only", async () => {
    const employee = await login(await createUser(companyId, "USER"));
    expect((await api().get("/template").set(auth(employee)).expect(200)).body.length).toBeGreaterThan(0);
    await api().post("/template").set(auth(employee)).send({ name: "Pas moi" }).expect(403);
    await api().put(`/template/${standardId}`).set(auth(employee)).send({ name: "Pas moi" }).expect(403);
  });
});
