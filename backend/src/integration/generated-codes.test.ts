import { describe, expect, it } from "vitest";
import { api, auth, createClient, createCompanyWithAdmin, createResource } from "./helpers";

// Client numbers and resource codes are generated per company - C0001,
// MAT0001, SER0001... - whatever the request says, one at a time even when
// created at once, and never handed out twice (archived rows count).
describe("generated client numbers and resource codes", () => {
  it("numbers a company's clients C0001, C0002... ignoring any number sent", async () => {
    const { token } = await createCompanyWithAdmin();
    const first = await createClient(token, { client_number: "MINE-1" });
    const second = await createClient(token);
    expect([first.client_number, second.client_number]).toEqual(["C0001", "C0002"]);

    // Another company starts its own sequence.
    const other = await createCompanyWithAdmin();
    expect((await createClient(other.token)).client_number).toBe("C0001");
  });

  it("never gives two clients created at once the same number", async () => {
    const { token } = await createCompanyWithAdmin();
    const clients = await Promise.all(Array.from({ length: 8 }, () => createClient(token)));
    expect(clients.map(client => client.client_number).sort()).toEqual(
      Array.from({ length: 8 }, (_, index) => `C000${index + 1}`)
    );
  });

  it("doesn't reuse an archived client's number", async () => {
    const { token } = await createCompanyWithAdmin();
    const first = await createClient(token);
    await api().patch(`/client/${first.id}/archive`).set(auth(token)).expect(200);
    expect((await createClient(token)).client_number).toBe("C0002");
  });

  it("codes resources MAT0001 / SER0001 by type, ignoring any code sent", async () => {
    const { token } = await createCompanyWithAdmin();
    const material = await createResource(token, { code: "MINE-1" });
    const service = await createResource(token, { type: "SERVICE" });
    const secondMaterial = await createResource(token);
    expect([material.code, service.code, secondMaterial.code]).toEqual(["MAT0001", "SER0001", "MAT0002"]);
  });

  it("doesn't reuse an archived resource's code, nor let an edit change it", async () => {
    const { token } = await createCompanyWithAdmin();
    const first = await createResource(token);
    await api().put(`/resource/${first.id}`).set(auth(token))
      .send({ code: "CHANGED", name: "Renamed", unit: "m2", selling_price: 20, purchase_price: null, reference: null })
      .expect(200)
      .expect(res => expect(res.body.code).toBe("MAT0001"));
    await api().patch(`/resource/${first.id}/archive`).set(auth(token)).expect(200);
    expect((await createResource(token)).code).toBe("MAT0002");
  });

  it("stores a resource's reference trimmed, an empty one as null", async () => {
    const { token } = await createCompanyWithAdmin();
    expect((await createResource(token, { reference: "  ART-4711 " })).reference).toBe("ART-4711");
    expect((await createResource(token, { reference: "" })).reference).toBeNull();
    await api().post("/resource").set(auth(token))
      .send({ type: "MATERIAL", name: "X", unit: "m2", selling_price: 1, purchase_price: null, parent_resource_id: null, reference: "x".repeat(51) })
      .expect(400);
  });

  it("refuses a resource type it can't code", async () => {
    const { token } = await createCompanyWithAdmin();
    await api().post("/resource").set(auth(token))
      .send({ type: "OTHER", name: "X", unit: "m2", selling_price: 1, purchase_price: null, parent_resource_id: null })
      .expect(400);
  });
});
