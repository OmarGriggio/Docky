import { afterAll, inject } from "vitest";

// Runs in each test file's own process before the file itself is imported:
// the environment backend/.env gives the real server, pointed at the test
// database. No S3 server behind S3_* - the flows tested here never store a
// file - and no Discord webhook, so nothing is ever sent out.
const database = inject("database");

Object.assign(process.env, {
  DB_HOST: database.host,
  DB_PORT: String(database.port),
  DB_USER: database.user,
  DB_PASSWORD: database.password,
  DB_NAME: database.database,
  JWT_SECRET: "integration-test-access-secret",
  JWT_REFRESH_SECRET: "integration-test-refresh-secret",
  S3_ENDPOINT: "http://localhost:9",
  S3_REGION: "us-east-1",
  S3_ACCESS_KEY: "integration-test",
  S3_SECRET_KEY: "integration-test",
  S3_BUCKET: "integration-test",
});
delete process.env.DISCORD_WEBHOOK_URL;

afterAll(async () => {
  const { pool } = await import("../shared/config/database.js");
  await pool.end();
});
