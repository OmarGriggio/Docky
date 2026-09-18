import fs from "fs";
import path from "path";
import { pool } from "../config/database";

// zz_migrations/ lives at the repo root, bind-mounted read-only into this
// container at ./zz_migrations (see docker-compose.yml/.prod.yml) - both the
// dev (tsx) and prod (compiled dist/) images run with /app as their
// WORKDIR, so this resolves the same way in either.
const MIGRATIONS_DIR = path.join(process.cwd(), "zz_migrations");

// 000_base.sql/001_data.sql are the one-time bootstrap Postgres' own
// docker-entrypoint-initdb.d already applies by itself, but only to a
// brand-new empty volume - never re-run them here (000_base.sql alone
// starts with DROP SCHEMA public CASCADE).
const BOOTSTRAP_FILES = new Set(["000_base.sql", "001_data.sql"]);

// Runs any zz_migrations/*.sql file (except the bootstrap ones above) that
// isn't recorded in schema_migrations yet, in filename order, each in its
// own transaction - so a fresh dev/prod database left running for a while
// picks up new schema changes automatically on the next backend restart,
// instead of needing `docker compose exec postgres psql -f ...` by hand.
export const runMigrationsServ = async (): Promise<void> => {
    await pool.query(`
        CREATE TABLE IF NOT EXISTS schema_migrations (
            filename VARCHAR(255) PRIMARY KEY,
            applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
        );
    `);

    const files = fs.readdirSync(MIGRATIONS_DIR)
        .filter(file => file.endsWith(".sql") && !BOOTSTRAP_FILES.has(file))
        .sort();

    for (const file of files) {
        const { rows } = await pool.query("SELECT 1 FROM schema_migrations WHERE filename = $1", [file]);
        if (rows.length > 0) {
            continue;
        }

        console.log(`Running migration: ${file}`);
        const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), "utf-8");

        const client = await pool.connect();
        try {
            await client.query("BEGIN");
            await client.query(sql);
            await client.query("INSERT INTO schema_migrations (filename) VALUES ($1)", [file]);
            await client.query("COMMIT");
        } catch (err) {
            await client.query("ROLLBACK");
            throw err;
        } finally {
            client.release();
        }
    }
};
