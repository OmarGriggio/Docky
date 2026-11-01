import { randomUUID } from "node:crypto";
import { beforeAll, describe, expect, it } from "vitest";
import { api, auth, createCompanyWithAdmin } from "./helpers";

// A client can be created without an email, and with its first address
// typed straight into the same form - created together or not at all.
describe("creating a client", () => {
  let token: string;

  beforeAll(async () => {
    ({ token } = await createCompanyWithAdmin());
  });

  const newClient = (fields: Record<string, unknown> = {}) => ({
    client_number: `C-${randomUUID()}`,
    type: "INDIVIDUAL",
    last_name: "Dupont",
    email: "",
    ...fields,
  });

  it("stores an empty email as null", async () => {
    const created = await api().post("/client").set(auth(token)).send(newClient()).expect(200);
    expect(created.body.email).toBeNull();
  });

  it("creates the given address as the client's primary one", async () => {
    const created = await api().post("/client").set(auth(token)).send(newClient({
      address: { attention: "", street: " Rue du Rhône 1 ", postal_code: "1950", city: "Sion", country: "Suisse" },
    })).expect(200);

    const client = await api().get(`/client/${created.body.id}`).set(auth(token)).expect(200);
    expect(client.body.addresses).toHaveLength(1);
    expect(client.body.addresses[0]).toMatchObject({
      is_primary: true, attention: null, street: "Rue du Rhône 1", postal_code: "1950", city: "Sion", country: "Suisse",
    });
  });

  it("refuses an incomplete address and creates no client", async () => {
    const body = newClient({ address: { street: "Rue du Rhône 1", postal_code: "", city: "Sion", country: "Suisse" } });
    await api().post("/client").set(auth(token)).send(body).expect(400);

    const list = await api().get("/client?includeArchived=true").set(auth(token)).expect(200);
    expect(list.body.map((client: { client_number: string }) => client.client_number)).not.toContain(body.client_number);
  });
});
