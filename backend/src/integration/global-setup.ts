import fs from "fs";
import path from "path";
import { Client } from "pg";
import { PostgreSqlContainer, StartedPostgreSqlContainer } from "@testcontainers/postgresql";
import type { TestProject } from "vitest/node";

// Where every test file's process finds the database (see env.ts).
export interface TestDatabase {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
}

declare module "vitest" {
  export interface ProvidedContext {
    database: TestDatabase;
  }
}

const MIGRATIONS_DIR = path.resolve(__dirname, "../../../zz_migrations");

// Once per run, before any test file: a brand-new Postgres (same major
// version as docker-compose's POSTGRES_VERSION), built the way a fresh
// production volume is - 000_base.sql and 001_data.sql (the two seeded
// companies), then every later migration through the app's own
// runMigrationsServ(). Thrown away at the end, so every run starts clean.
export default async function setup(project: TestProject) {
  const container: StartedPostgreSqlContainer = await new PostgreSqlContainer("postgres:17-alpine").start();

  const database: TestDatabase = {
    host: container.getHost(),
    port: container.getPort(),
    user: container.getUsername(),
    password: container.getPassword(),
    database: container.getDatabase(),
  };

  const client = new Client(database);
  await client.connect();
  for (const file of ["000_base.sql", "001_data.sql"]) {
    await client.query(fs.readFileSync(path.join(MIGRATIONS_DIR, file), "utf-8"));
  }
  await client.end();

  // database.ts builds its pool from these when first imported - hence the
  // dynamic import, after they're set.
  Object.assign(process.env, {
    DB_HOST: database.host,
    DB_PORT: String(database.port),
    DB_USER: database.user,
    DB_PASSWORD: database.password,
    DB_NAME: database.database,
    MIGRATIONS_DIR,
  });
  const { runMigrationsServ } = await import("../shared/migrations/migrate.js");
  const { pool } = await import("../shared/config/database.js");
  await runMigrationsServ();
  await pool.end();

  project.provide("database", database);

  return async () => {
    await container.stop();
  };
}
