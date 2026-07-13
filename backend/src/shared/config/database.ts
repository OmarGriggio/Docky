import { Pool, types } from "pg";

// NUMERIC/DECIMAL (OID 1700) comes back as a string by default to avoid
// precision loss on very large values; our schema only uses small NUMERIC(n,2)
// amounts, so parse them as floats to match the `number` types used across the app.
types.setTypeParser(1700, (value) => parseFloat(value));

export const pool = new Pool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});