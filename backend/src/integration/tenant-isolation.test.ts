import { beforeAll, describe, expect, it } from "vitest";
import { api, auth, createClient, createCompanyWithAdmin } from "./helpers";

// Company B must never reach company A's data by its id - not reading it,
// not changing it, not pointing at it from its own records. Always a 404,
// as if the record didn't exist.
describe("multi-tenant isolation", () => {
  let tokenA: string;
  let tokenB: string;
  let clientA: { id: number; last_name: string };

  beforeAll(async () => {
    ({ token: tokenA } = await createCompanyWithAdmin());
    ({ token: tokenB } = await createCompanyWithAdmin());
    clientA = await createClient(tokenA);
  });

  it("hides company A's client from company B", async () => {
    await api().get(`/client/${clientA.id}`).set(auth(tokenB)).expect(404);

    const list = await api().get("/client?includeArchived=true").set(auth(tokenB)).expect(200);
    expect(list.body.map((client: { id: number }) => client.id)).not.toContain(clientA.id);
  });

  it("doesn't let company B change or archive company A's client", async () => {
    await api().put(`/client/${clientA.id}`).set(auth(tokenB)).send({ ...clientA, last_name: "Changed by B" }).expect(404);
    await api().patch(`/client/${clientA.id}/archive`).set(auth(tokenB)).expect(404);

    const stillA = await api().get(`/client/${clientA.id}`).set(auth(tokenA)).expect(200);
    expect(stillA.body.last_name).toBe(clientA.last_name);
    expect(stillA.body.is_active).toBe(true);
  });

  it("doesn't let company B make a document out to company A's client", async () => {
    await api().post("/document").set(auth(tokenB)).send({
      type: "QUOTE",
      client_id: clientA.id,
      address_id: null,
      date: "2026-10-30",
      discount: 0,
      vat_rate: 8.1,
    }).expect(404);
  });
});
