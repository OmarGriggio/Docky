import { beforeAll, describe, expect, it } from "vitest";
import { api, auth, createClient, createCompanyWithAdmin, createDocument, createUser, login, saveContent, sectionOf } from "./helpers";
import { db } from "../shared/config/database";

// Payment reminder levels (Paramètres > Rappels) and each invoice's
// reminders: sent in order, each once due, recorded with its fees, printed
// again as it went out, the latest taken back - see reminder.service.ts.
describe("payment reminders", () => {
  let companyId: number;
  let token: string;
  let clientId: number;

  beforeAll(async () => {
    ({ companyId, token } = await createCompanyWithAdmin());
    clientId = (await createClient(token)).id;
    // What a QR-bill needs.
    await api().put(`/company/${companyId}`).set(auth(token))
      .send({ name: "Rappels Sàrl", vat_rate: 8.1, iban: "CH9300762011623852957", postal_code: "1950", city: "Sion", country: "Suisse" }).expect(200);
  });

  const settings = (levels: unknown) => api().put("/reminder/settings").set(auth(token)).send({ levels });
  const reminders = async (documentId: number) => (await api().get(`/reminder/document/${documentId}`).set(auth(token)).expect(200)).body;
  const send = (documentId: number) => api().post(`/reminder/document/${documentId}`).set(auth(token));
  const toSend = async () => (await api().get("/reminder/to-send").set(auth(token)).expect(200)).body as { id: number; next: { level: number } }[];
  const invoice = async (dueDate: string, status = "SENT") => {
    const created = await createDocument(token, "INVOICE", clientId, { due_date: dueDate });
    await saveContent(token, created.id, [sectionOf("Travaux", [{ quantity: 1, unit_price: 100 }])]).expect(200);
    if (status !== "DRAFT") {
      await api().patch(`/document/${created.id}/status`).set(auth(token)).send({ status }).expect(200);
    }
    return created;
  };
  // A level is due a day after the previous one at the earliest: moves an
  // invoice's reminders a month back, as if sent then.
  const backdate = (documentId: number) =>
    db().query("UPDATE invoice_reminders SET date = date - 30 WHERE document_id = $1", [documentId]);
  const pdf = (documentId: number, level?: number) =>
    api().get(`/pdf/reminder/${documentId}${level ? `?level=${level}` : ""}`).set(auth(token)).buffer(true).parse((res, done) => {
      const chunks: Buffer[] = [];
      res.on("data", (chunk: Buffer) => chunks.push(chunk));
      res.on("end", () => done(null, Buffer.concat(chunks)));
    });

  it("has default levels until the admin sets its own, an employee can't", async () => {
    const defaults = (await api().get("/reminder/settings").set(auth(token)).expect(200)).body;
    expect(defaults.map((level: { delay_days: number }) => level.delay_days)).toEqual([10, 14, 14]);

    const saved = (await settings([{ level: 1, delay_days: 1 }, { level: 2, delay_days: 1, fee: 20 }, { level: 3, delay_days: 1, fee: 30 }]).expect(200)).body;
    expect(saved).toMatchObject([{ level: 1, fee: 0 }, { level: 2, fee: 20 }, { level: 3, fee: 30 }]);
    await settings([{ level: 2, delay_days: -1 }]).expect(400);
    // At least a day: never on the due date itself, nor two levels the same day.
    await settings([{ level: 1, delay_days: 0 }]).expect(400);
    await settings([{ level: 3, delay_days: 0 }]).expect(400);

    const employee = await login(await createUser(companyId, "USER"));
    await api().put("/reminder/settings").set(auth(employee)).send({ levels: [] }).expect(403);
  });

  it("sends the levels in order, adding up the fees, and lists the invoice while one is due", async () => {
    const overdue = await invoice("2026-01-05");
    expect((await reminders(overdue.id)).next).toMatchObject({ level: 1, due_on: "2026-01-06", total_fees: 0 });
    expect((await toSend()).find(item => item.id === overdue.id)?.next.level).toBe(1);

    expect((await send(overdue.id).expect(201)).body).toMatchObject({ level: 1, fee: 0, total_fees: 0, amount_due: 108.1 });
    await backdate(overdue.id);
    expect((await send(overdue.id).expect(201)).body).toMatchObject({ level: 2, fee: 20, total_fees: 20 });
    await backdate(overdue.id);
    expect((await send(overdue.id).expect(201)).body).toMatchObject({ level: 3, fee: 30, total_fees: 50 });
    expect((await send(overdue.id).expect(409)).body.code).toBe("REMINDER_NONE_LEFT");

    const state = await reminders(overdue.id);
    expect(state.reminders.map((reminder: { level: number }) => reminder.level)).toEqual([1, 2, 3]);
    expect(state.next).toBeNull();
    expect((await toSend()).find(item => item.id === overdue.id)).toBeUndefined();

    // The documents list says how far it went.
    const listed = (await api().get("/document?type=INVOICE").set(auth(token)).expect(200)).body.find((doc: { id: number }) => doc.id === overdue.id);
    expect(listed.reminder_level).toBe(3);
  });

  it("waits for a level's delay after the previous one - a double click never sends two", async () => {
    const overdue = await invoice("2026-01-05");
    await send(overdue.id).expect(201);
    // Even a delay of a single day: never two levels the same day.
    expect((await send(overdue.id).expect(409)).body.code).toBe("REMINDER_NOT_DUE");
    expect((await toSend()).find(item => item.id === overdue.id)).toBeUndefined();
  });

  it("only reminds a sent invoice once it's overdue", async () => {
    expect((await send((await invoice("2026-01-05", "DRAFT")).id).expect(409)).body.code).toBe("REMINDER_INVOICE_NOT_SENT");
    expect((await send((await invoice("2099-01-01")).id).expect(409)).body.code).toBe("REMINDER_NOT_OVERDUE");
    const quote = await createDocument(token, "QUOTE", clientId);
    await send(quote.id).expect(404);
  });

  it("prints a reminder as it went out, the next one previewed, and takes back only the latest", async () => {
    const overdue = await invoice("2026-01-05");
    expect((await pdf(overdue.id).expect(200)).body.subarray(0, 5).toString()).toBe("%PDF-");
    const first = (await send(overdue.id).expect(201)).body;
    await backdate(overdue.id);
    const second = (await send(overdue.id).expect(201)).body;
    expect((await pdf(overdue.id, 2).expect(200)).body.subarray(0, 5).toString()).toBe("%PDF-");
    await pdf(overdue.id, 3).expect(404);

    expect((await api().delete(`/reminder/${first.id}`).set(auth(token)).expect(409)).body.code).toBe("REMINDER_NOT_LATEST");
    await api().delete(`/reminder/${second.id}`).set(auth(token)).expect(204);
    expect((await reminders(overdue.id)).next).toMatchObject({ level: 2 });
  });

  it("keeps the reminders of an invoice once paid - its history", async () => {
    const overdue = await invoice("2026-01-05");
    const sent = (await send(overdue.id).expect(201)).body;
    await api().patch(`/document/${overdue.id}/status`).set(auth(token)).send({ status: "PAID" }).expect(200);
    expect((await api().delete(`/reminder/${sent.id}`).set(auth(token)).expect(409)).body.code).toBe("REMINDER_INVOICE_CLOSED");
    const state = await reminders(overdue.id);
    expect(state).toMatchObject({ status: "PAID", next: null });
    expect(state.reminders).toHaveLength(1);
  });

  it("answers an id that isn't one with a 404, never a server error", async () => {
    await api().delete("/reminder/abc").set(auth(token)).expect(404);
    await api().get("/reminder/document/abc").set(auth(token)).expect(404);
    await api().post("/reminder/document/1.5").set(auth(token)).expect(404);
  });

  it("never shows or changes another company's reminders", async () => {
    const overdue = await invoice("2026-01-05");
    const sent = (await send(overdue.id).expect(201)).body;
    const other = await createCompanyWithAdmin();
    await api().get(`/reminder/document/${overdue.id}`).set(auth(other.token)).expect(404);
    await api().post(`/reminder/document/${overdue.id}`).set(auth(other.token)).expect(404);
    await api().delete(`/reminder/${sent.id}`).set(auth(other.token)).expect(404);
    expect((await api().get("/reminder/to-send").set(auth(other.token)).expect(200)).body).toEqual([]);
  });
});
