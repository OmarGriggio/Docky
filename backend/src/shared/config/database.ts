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
  // Waiting for a free connection fails after 5s instead of forever - a
  // pool that ever runs dry (every connection held by a transaction waiting
  // on yet another one) then surfaces as errors, not as a frozen server.
  connectionTimeoutMillis: 5000,
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
//
// Every repository function goes through db(), never `pool` directly: a
// `pool` query inside `work` would hold this connection while waiting for a
// second one - enough of those at once and the pool deadlocks. And never
// start an un-awaited query inside `work`: it would run on this connection
// after it's been released.
export const withTransaction = async <T>(work: () => Promise<T>): Promise<T> => {
  if (transactionClient.getStore()) {
    return work();
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await transactionClient.run(client, work);
    await client.query("COMMIT");
    client.release();
    return result;
  } catch (err) {
    try {
      await client.query("ROLLBACK");
      client.release();
    } catch (rollbackErr) {
      // The connection itself is broken - destroy it rather than hand it
      // back to the pool for someone else's request.
      client.release(rollbackErr as Error);
    }
    throw err;
  }
};
