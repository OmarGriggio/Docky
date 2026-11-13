import { beforeAll, describe, expect, it } from "vitest";
import {
  api, auth, createClient, createCompanyWithAdmin, createDocument, createResource, findProjectsOfQuote, getDocumentComplete,
  postDocument, saveContent, sectionOf,
} from "./helpers";

// Deposit invoices on a chantier (POST /project/:id/deposit-invoice): at any
// time before its final invoice, a percentage of its accepted quote's total
// incl. VAT or an amount - see deposit.ts.
describe("deposit invoices", () => {
  let token: string;
  let clientId: number;

  beforeAll(async () => {
    ({ token } = await createCompanyWithAdmin());
    clientId = (await createClient(token)).id;
  });

  const deposit = (projectId: number, body: Record<string, unknown>) =>
    api().post(`/project/${projectId}/deposit-invoice`).set(auth(token)).send(body);
  const billing = async (projectId: number) =>
    (await api().get(`/project/${projectId}/billing`).set(auth(token)).expect(200)).body;
  const setStatus = (documentId: number, status: string) =>
    api().patch(`/document/${documentId}/status`).set(auth(token)).send({ status });

  // A chantier accepted from a quote of 50'000.- excl. VAT, 54'050.- incl. 8.1 %.
  const chantier = async () => {
    const resource = await createResource(token);
    const quote = await createDocument(token, "QUOTE", clientId);
    await saveContent(token, quote.id, [sectionOf("Escalier", [{ quantity: 1, unit_price: 50000, resource_id: resource.id }])]).expect(200);
    await api().post(`/document/${quote.id}/accept`).set(auth(token)).expect(200);
    const [project] = await findProjectsOfQuote(token, quote.number);
    return { project, quote };
  };

  it("asks for a percentage of the quote's total incl. VAT, as a draft invoice of its own", async () => {
    const { project, quote } = await chantier();
    const res = await deposit(project.id, { percent: 30 }).expect(200);

    expect(res.body).toMatchObject({
      type: "INVOICE", invoice_kind: "DEPOSIT", status: "DRAFT", parent_document_id: project.document_id,
      amount_excl_vat: 15000, amount_incl_vat: 16215, vat_rate: 8.1, early_payment_discount: 0,
    });
    expect(res.body.number).toMatch(/^FAC-\d{4}-\d{4}$/);

    const complete = await getDocumentComplete(token, res.body.id);
    expect(complete.lines).toHaveLength(1);
    expect(complete.lines[0].label).toBe(`Acompte n° 1 – 30 % selon offre ${quote.number}`);
  });

  it("numbers the deposits, and adds them up on the chantier", async () => {
    const { project } = await chantier();
    const first = (await deposit(project.id, { percent: 30 }).expect(200)).body;
    const second = (await deposit(project.id, { amount_incl_vat: 10810 }).expect(200)).body;
    expect((await getDocumentComplete(token, second.id)).lines[0].label).toMatch(/^Acompte n° 2 selon offre/);

    // Drafts aren't the client's yet.
    expect(await billing(project.id)).toMatchObject({ quoteInclVat: 54050, invoicedInclVat: 0, remainingInclVat: 54050 });

    await setStatus(first.id, "SENT").expect(200);
    await setStatus(first.id, "PAID").expect(200);
    await setStatus(second.id, "SENT").expect(200);
    const summary = await billing(project.id);
    expect(summary).toMatchObject({ invoicedInclVat: 27025, paidInclVat: 16215, remainingInclVat: 27025, finalInvoice: null });
    expect(summary.deposits.map((d: { id: number }) => d.id)).toEqual([first.id, second.id]);
    expect(summary.deductible.map((d: { document_id: number }) => d.document_id)).toEqual([first.id, second.id]);
  });

  it("is possible while the chantier is in progress, and doesn't count as its one invoice", async () => {
    const { project } = await chantier();
    const first = (await deposit(project.id, { percent: 30 }).expect(200)).body;
    await setStatus(first.id, "SENT").expect(200);

    await api().patch(`/project/${project.id}/complete`).set(auth(token)).expect(200);
    const final = await postDocument(token, "INVOICE", clientId, { parent_document_id: project.document_id }).expect(200);
    expect(final.body.invoice_kind).toBe("STANDARD");

    // Once the final invoice is there, no more deposits.
    await deposit(project.id, { percent: 10 }).expect(409);
  });

  it("needs a quote for a percentage - a chantier created by hand takes an amount", async () => {
    const project = (await api().post("/project").set(auth(token)).send({ name: "By hand", client_id: clientId, project_type_id: null }).expect(200)).body;
    const res = await deposit(project.id, { percent: 30 }).expect(400);
    expect(res.body.code).toBe("DEPOSIT_NEEDS_QUOTE");
    await deposit(project.id, { amount_incl_vat: 1081 }).expect(200);
    expect(await billing(project.id)).toMatchObject({ quoteInclVat: null, remainingInclVat: null });
  });

  it("refuses an amount or percentage that makes no sense", async () => {
    const { project } = await chantier();
    await deposit(project.id, {}).expect(400);
    await deposit(project.id, { percent: 150 }).expect(400);
    await deposit(project.id, { amount_incl_vat: -10 }).expect(400);
    await deposit(project.id, { percent: 30, amount_incl_vat: 100 }).expect(400);
  });

  it("only reaches the caller's own chantiers", async () => {
    const { project } = await chantier();
    const other = await createCompanyWithAdmin();
    await api().post(`/project/${project.id}/deposit-invoice`).set(auth(other.token)).send({ percent: 30 }).expect(404);
    await api().get(`/project/${project.id}/billing`).set(auth(other.token)).expect(404);
  });

  describe("the final invoice", () => {
    const deductions = async (invoiceId: number) =>
      (await api().get(`/document/${invoiceId}/deductions`).set(auth(token)).expect(200)).body;
    const finalInvoice = (projectDocumentId: number) =>
      postDocument(token, "INVOICE", clientId, { parent_document_id: projectDocumentId });
    const complete = (projectId: number) => api().patch(`/project/${projectId}/complete`).set(auth(token)).expect(200);

    it("deducts the deposits sent or paid, and leaves the balance to pay", async () => {
      const { project } = await chantier();
      const paid = (await deposit(project.id, { percent: 30 }).expect(200)).body;
      const sent = (await deposit(project.id, { percent: 30 }).expect(200)).body;
      const cancelled = (await deposit(project.id, { amount_incl_vat: 500 }).expect(200)).body;
      await setStatus(paid.id, "SENT").expect(200);
      await setStatus(paid.id, "PAID").expect(200);
      await setStatus(sent.id, "SENT").expect(200);
      await setStatus(cancelled.id, "CANCELLED").expect(200);
      await complete(project.id);

      const final = (await finalInvoice(project.document_id).expect(200)).body;
      // The chantier's ledger as the final invoice's content: 50'000.- + 8.1 %.
      await saveContent(token, final.id, [sectionOf("Escalier", [{ quantity: 1, unit_price: 50000 }])]).expect(200);

      const result = await deductions(final.id);
      expect(result.deductions.map((d: { document_id: number }) => d.document_id)).toEqual([paid.id, sent.id]);
      expect(result.amount_due).toBe(21620);
    });

    it("can't be created while a deposit is still a draft", async () => {
      const { project } = await chantier();
      const draft = (await deposit(project.id, { percent: 30 }).expect(200)).body;
      await complete(project.id);

      const res = await finalInvoice(project.document_id).expect(409);
      expect(res.body.code).toBe("DEPOSIT_DRAFT_PENDING");

      await setStatus(draft.id, "SENT").expect(200);
      await finalInvoice(project.document_id).expect(200);
    });

    it("freezes its deductions once sent, and then a deposit it deducts can't be cancelled", async () => {
      const { project } = await chantier();
      const first = (await deposit(project.id, { percent: 30 }).expect(200)).body;
      await setStatus(first.id, "SENT").expect(200);
      await complete(project.id);
      const final = (await finalInvoice(project.document_id).expect(200)).body;

      // While it's a draft, cancelling a deposit just takes it off.
      const second = (await api().get(`/project/${project.id}/billing`).set(auth(token)).expect(200)).body;
      expect(second.deposits).toHaveLength(1);

      await setStatus(final.id, "SENT").expect(200);
      const sentFinal = (await api().get(`/document/${final.id}`).set(auth(token)).expect(200)).body;
      expect(sentFinal.deposit_deductions.map((d: { document_id: number }) => d.document_id)).toEqual([first.id]);

      const res = await setStatus(first.id, "CANCELLED").expect(409);
      expect(res.body.code).toBe("DEPOSIT_DEDUCTED");
    });

    it("lets a deposit be cancelled while the final invoice is a draft - it's no longer deducted", async () => {
      const { project } = await chantier();
      const first = (await deposit(project.id, { percent: 30 }).expect(200)).body;
      await setStatus(first.id, "SENT").expect(200);
      await complete(project.id);
      const final = (await finalInvoice(project.document_id).expect(200)).body;

      await setStatus(first.id, "CANCELLED").expect(200);
      expect((await deductions(final.id)).deductions).toEqual([]);
    });

    it("prints the balance as its QR-bill amount and the dashboard's", async () => {
      const { project } = await chantier();
      const first = (await deposit(project.id, { percent: 30 }).expect(200)).body;
      await setStatus(first.id, "SENT").expect(200);
      await complete(project.id);
      const final = (await finalInvoice(project.document_id).expect(200)).body;
      await saveContent(token, final.id, [sectionOf("Escalier", [{ quantity: 1, unit_price: 50000 }])]).expect(200);
      await setStatus(final.id, "SENT").expect(200);

      const open = (await api().get("/dashboard/open-invoices").set(auth(token)).expect(200)).body;
      const row = open.find((invoice: { id: number }) => invoice.id === final.id);
      expect(Number(row.amount_incl_vat)).toBe(37835);
    });
  });
});
