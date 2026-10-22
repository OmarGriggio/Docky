import { AsyncLocalStorage } from "async_hooks";
import { Pool, PoolClient, types } from "pg";

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

// The connection of the transaction currently running (see withTransaction),
// carried along the async call chain - so a repository function doesn't need
// a `client` parameter threaded through every service to take part in one.
const transactionClient = new AsyncLocalStorage<PoolClient>();

// What a repository queries through: the current transaction's own
// connection inside withTransaction, the shared pool everywhere else.
export const db = (): Pick<PoolClient, "query"> => transactionClient.getStore() ?? pool;

// Runs `work` in one transaction: every db() query inside it (however deep
// in the call chain) goes through the same connection, committed only if
// `work` resolves, rolled back if it throws. A nested call just joins the
// outer transaction.
export const withTransaction = async <T>(work: () => Promise<T>): Promise<T> => {
  if (transactionClient.getStore()) {
    return work();
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await transactionClient.run(client, work);
    await client.query("COMMIT");
    return result;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
};
