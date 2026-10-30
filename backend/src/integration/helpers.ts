import { randomUUID } from "crypto";
import bcrypt from "bcrypt";
import request from "supertest";
import app from "../app";
import { db } from "../shared/config/database";
import { createPlaceholderClientInDB } from "../modules/clients/client.repository";

export const PASSWORD = "integration-password";
// bcrypt's lowest cost: hashing at the real cost for every test user would
// only slow the run down, and login compares against it all the same.
const PASSWORD_HASH = bcrypt.hashSync(PASSWORD, 4);

export const api = () => request(app);

// A company of its own for each test file, made straight in the database:
// the public registration is rate-limited to 5 an hour, and no test should
// depend on another one's data (or on the seeded companies).
export const createCompany = async (name = `Test ${randomUUID()}`): Promise<number> => {
  const { rows } = await db().query("INSERT INTO companies (name) VALUES ($1) RETURNING id", [name]);
  await createPlaceholderClientInDB(rows[0].id);
  return rows[0].id;
};

type Role = "ADMIN" | "USER" | "PLATFORM_ADMIN";

export const createUser = async (companyId: number, role: Role = "ADMIN", isActive = true): Promise<string> => {
  const email = `${role.toLowerCase()}-${randomUUID()}@test.docky.ch`;
  await db().query(
    "INSERT INTO users (company_id, role, email, password_hash, is_active) VALUES ($1, $2, $3, $4, $5)",
    [companyId, role, email, PASSWORD_HASH, isActive]
  );
  return email;
};

export const login = async (email: string, password = PASSWORD): Promise<string> => {
  const res = await api().post("/auth/login").send({ email, passwordHash: password }).expect(200);
  return res.body.token;
};

// A company, its admin, and that admin's access token.
export const createCompanyWithAdmin = async () => {
  const companyId = await createCompany();
  const email = await createUser(companyId, "ADMIN");
  const token = await login(email);
  return { companyId, email, token };
};

export const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

let clientCount = 0;

export const createClient = async (token: string, fields: Record<string, unknown> = {}) => {
  clientCount++;
  const res = await api().post("/client").set(auth(token)).send({
    client_number: `T${clientCount}-${randomUUID().slice(0, 8)}`,
    type: "INDIVIDUAL",
    last_name: "Muster",
    first_name: "Anna",
    email: `client-${randomUUID()}@test.docky.ch`,
    ...fields,
  }).expect(200);
  return res.body;
};

let resourceCount = 0;

export const createResource = async (token: string, fields: Record<string, unknown> = {}) => {
  resourceCount++;
  const res = await api().post("/resource").set(auth(token)).send({
    type: "MATERIAL",
    code: `R${resourceCount}-${randomUUID().slice(0, 8)}`,
    name: "Plaque de plâtre",
    unit: "m2",
    selling_price: 20,
    purchase_price: null,
    parent_resource_id: null,
    ...fields,
  }).expect(200);
  return res.body;
};

type DocumentType = "QUOTE" | "INVOICE";

export const postDocument = (token: string, type: DocumentType, clientId: number, fields: Record<string, unknown> = {}) =>
  api().post("/document").set(auth(token)).send({
    type,
    client_id: clientId,
    address_id: null,
    parent_document_id: null,
    date: "2026-10-30",
    discount: 0,
    vat_rate: 8.1,
    ...fields,
  });

// A new quote or invoice - always an active DRAFT, numbered by the server.
export const createDocument = async (token: string, type: DocumentType, clientId: number, fields: Record<string, unknown> = {}) => {
  const res = await postDocument(token, type, clientId, fields).expect(200);
  return res.body;
};

// A section of hand-typed lines (10.- each unless overridden).
export const sectionOf = (title: string, lines: Record<string, unknown>[]) => ({
  title,
  description: null,
  lines: lines.map(line => ({ type: "MATERIAL", label: "Line", quantity: 1, unit: "pce", unit_price: 10, resource_id: null, ...line })),
});

export const saveContent = (token: string, documentId: number, sections: unknown[]) =>
  api().put(`/document/${documentId}/content`).set(auth(token)).send({ sections });

// A document with its active sections and lines.
export const getDocumentComplete = async (token: string, documentId: number) => {
  const res = await api().get(`/document-complete/${documentId}`).set(auth(token)).expect(200);
  return res.body;
};

// The chantier accepting this quote created (the project list carries each
// chantier's quote number).
export const findProjectsOfQuote = async (token: string, quoteNumber: string) => {
  const res = await api().get("/project?includeArchived=true").set(auth(token)).expect(200);
  return res.body.filter((project: { quote_number: string | null }) => project.quote_number === quoteNumber);
};
