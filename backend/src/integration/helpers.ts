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
