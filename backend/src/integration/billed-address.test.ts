import { beforeAll, describe, expect, it } from "vitest";
import { api, auth, createClient, createCompanyWithAdmin, createDocument, saveContent, sectionOf } from "./helpers";

// A quote or invoice freezes the client's name and address once it leaves
// DRAFT - a client who moves afterwards no longer changes it.
describe("the address a document is sent to", () => {
  let token: string;

  beforeAll(async () => {
    ({ token } = await createCompanyWithAdmin());
  });

  const clientWithAddress = async () => {
    const client = await createClient(token, {
      type: "PROFESSIONAL",
      company_name: "Dupont SA",
      address: { attention: "", street: "Rue du Rhône 1", postal_code: "1950", city: "Sion", country: "Suisse" },
    });
    const full = await api().get(`/client/${client.id}`).set(auth(token)).expect(200);
    return { client, address: full.body.addresses[0] };
  };

  const getDocument = async (id: number) => (await api().get(`/document/${id}`).set(auth(token)).expect(200)).body;
  const setStatus = (id: number, status: string) => api().patch(`/document/${id}/status`).set(auth(token)).send({ status });
  const move = (addressId: number) => api().put(`/address/${addressId}`).set(auth(token))
    .send({ attention: null, street: "Avenue de la Gare 9", postal_code: "1003", city: "Lausanne", country: "Suisse" })
    .expect(200);

  it("follows the client while it's a draft", async () => {
    const { client } = await clientWithAddress();
    const invoice = await createDocument(token, "INVOICE", client.id);
    expect((await getDocument(invoice.id)).billed_address).toBeNull();
  });

  it("freezes it when the invoice is sent, whatever the client becomes", async () => {
    const { client, address } = await clientWithAddress();
    const invoice = await createDocument(token, "INVOICE", client.id, { address_id: address.id });
    await setStatus(invoice.id, "SENT").expect(200);

    await move(address.id);
    await api().put(`/client/${client.id}`).set(auth(token))
      .send({ type: "PROFESSIONAL", company_name: "Dupont & Fils SA", last_name: null, first_name: null, title: null, email: null, phone: null, note: null, language: "FR" })
      .expect(200);

    expect((await getDocument(invoice.id)).billed_address).toEqual({
      name: "Dupont SA", street: "Rue du Rhône 1", postal_code: "1950", city: "Sion", country: "Suisse",
      location: "Rue du Rhône 1, 1950 Sion",
    });
  });

  it("keeps the first frozen address when the invoice is then paid", async () => {
    const { client, address } = await clientWithAddress();
    const invoice = await createDocument(token, "INVOICE", client.id);
    await setStatus(invoice.id, "SENT").expect(200);
    await move(address.id);
    await setStatus(invoice.id, "PAID").expect(200);
    expect((await getDocument(invoice.id)).billed_address.street).toBe("Rue du Rhône 1");
  });

  it("lets a quote back in DRAFT follow the client again", async () => {
    const { client, address } = await clientWithAddress();
    const quote = await createDocument(token, "QUOTE", client.id);
    await setStatus(quote.id, "SENT").expect(200);
    await setStatus(quote.id, "DRAFT").expect(200);
    expect((await getDocument(quote.id)).billed_address).toBeNull();

    await move(address.id);
    await setStatus(quote.id, "SENT").expect(200);
    expect((await getDocument(quote.id)).billed_address.city).toBe("Lausanne");
  });

  it("freezes a quote accepted straight from DRAFT", async () => {
    const { client, address } = await clientWithAddress();
    const quote = await createDocument(token, "QUOTE", client.id);
    await saveContent(token, quote.id, [sectionOf("Travaux", [{}])]).expect(200);
    await api().post(`/document/${quote.id}/accept`).set(auth(token)).expect(200);
    await move(address.id);
    expect((await getDocument(quote.id)).billed_address.street).toBe("Rue du Rhône 1");
  });
});
