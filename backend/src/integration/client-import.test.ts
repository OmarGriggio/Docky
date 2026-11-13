import { describe, expect, it } from "vitest";
import { api, auth, createClient, createCompanyWithAdmin } from "./helpers";

// Importing clients from a spreadsheet (POST /client/import): a dry run
// judges every row without writing anything; a real import creates every row
// or none, numbering them by the user's rule (see client-import.ts).
describe("importing clients", () => {
  const importRows = (token: string, rows: Record<string, unknown>[], dryRun = false) =>
    api().post(`/client/import${dryRun ? "?dryRun=true" : ""}`).set(auth(token)).send({ rows, defaultCountry: "Suisse", language: "FR" });

  const listClients = async (token: string) =>
    (await api().get("/client?includeArchived=true").set(auth(token)).expect(200)).body
      .filter((client: { is_placeholder: boolean }) => !client.is_placeholder);

  it("checks the rows on a dry run, writing nothing", async () => {
    const { token } = await createCompanyWithAdmin();
    const res = await importRows(token, [{ company_name: "Dupont SA" }, { first_name: "Jean" }], true).expect(200);

    expect(res.body.created).toBe(0);
    expect(res.body.rows[0].errors).toEqual([]);
    expect(res.body.rows[1].errors).toEqual([{ field: "last_name", code: "REQUIRED" }]);
    expect(await listClients(token)).toHaveLength(0);
  });

  it("creates every row with its address, keeping numbers and generating the others after them", async () => {
    const { token } = await createCompanyWithAdmin();
    const res = await importRows(token, [
      { company_name: "Dupont SA", client_number: "500", street: "Rue du Rhône 1", postal_code_city: "1950 Sion", language: "Deutsch" },
      { last_name: "Martin", client_number: "CLI-CHA-0001" },
      { last_name: "Favre" },
    ]).expect(200);
    expect(res.body.created).toBe(3);

    const clients = await listClients(token);
    const byName = (name: string) => clients.find((client: { company_name: string | null; last_name: string | null }) =>
      client.company_name === name || client.last_name === name);
    expect(byName("Dupont SA")).toMatchObject({ client_number: "C0500", type: "PROFESSIONAL", language: "DE", address_street: "Rue du Rhône 1", address_city: "Sion" });
    expect(byName("Martin")).toMatchObject({ client_number: "C0501", note: "Ancien n° : CLI-CHA-0001" });
    expect(byName("Favre").client_number).toBe("C0502");

    // The usual numbering goes on after them.
    expect((await createClient(token)).client_number).toBe("C0503");
  });

  it("writes nothing when a single row has an error - all or none", async () => {
    const { token } = await createCompanyWithAdmin();
    const res = await importRows(token, [{ last_name: "Valid" }, { last_name: "Broken", email: "not-an-email" }]).expect(422);

    expect(res.body.created).toBe(0);
    expect(res.body.rows[1].errors).toEqual([{ field: "email", code: "EMAIL_INVALID" }]);
    expect(await listClients(token)).toHaveLength(0);
  });

  it("refuses a number the company already has, archived clients included", async () => {
    const { token } = await createCompanyWithAdmin();
    const existing = await createClient(token);
    await api().patch(`/client/${existing.id}/archive`).set(auth(token)).expect(200);

    const res = await importRows(token, [{ last_name: "Dupont", client_number: "1" }]).expect(422);
    expect(res.body.rows[0].errors).toEqual([{ field: "client_number", code: "NUMBER_EXISTS", params: { number: "C0001" } }]);
  });

  it("only compares with the caller's own company", async () => {
    const other = await createCompanyWithAdmin();
    await createClient(other.token, { email: "shared@test.docky.ch" });

    const { token } = await createCompanyWithAdmin();
    const res = await importRows(token, [{ last_name: "Dupont", client_number: "1", email: "shared@test.docky.ch" }]).expect(200);
    expect(res.body.rows[0].errors).toEqual([]);
    expect((await listClients(other.token))).toHaveLength(1);
  });

  it("refuses more than 1000 rows", async () => {
    const { token } = await createCompanyWithAdmin();
    const rows = Array.from({ length: 1001 }, (_, index) => ({ last_name: `Client ${index}` }));
    const res = await importRows(token, rows, true).expect(400);
    expect(res.body.code).toBe("TOO_MANY_ROWS");
  });

  it("imports 1000 rows at once - a body bigger than the usual JSON limit", async () => {
    const { token } = await createCompanyWithAdmin();
    const rows = Array.from({ length: 1000 }, (_, index) => ({
      last_name: `Client ${index}`, first_name: "Jean", street: "Rue du Rhône 1", postal_code: "1950", city: "Sion",
      email: `client-${index}@import.docky.ch`, note: "Une note assez longue pour grossir le fichier importé.",
    }));
    const res = await importRows(token, rows).expect(200);
    expect(res.body.created).toBe(1000);
  }, 60_000);
});
