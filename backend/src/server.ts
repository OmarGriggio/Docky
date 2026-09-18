import "dotenv/config";
import app from "./app";
import { pool } from "./shared/config/database";
import { runMigrationsServ } from "./shared/migrations/migrate";
import { ensureBucketExistsServ } from "./shared/storage/storage.service";

const PORT = 3000;

// Sequential, and awaited before the server starts accepting requests -
// running against a database that's mid-migration (or an S3 bucket that
// doesn't exist yet) is worse than not starting at all.
const start = async () => {
  const { rows } = await pool.query("SELECT NOW()");
  console.log("DB OK:", rows[0]);

  await runMigrationsServ();

  await ensureBucketExistsServ();
  console.log("S3 bucket OK");

  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
};

start().catch(err => {
  console.error("Startup failed:", err);
  process.exit(1);
});