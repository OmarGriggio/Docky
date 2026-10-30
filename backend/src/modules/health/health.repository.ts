import { db } from "../../shared/config/database";

// The cheapest query that still needs a working connection from the pool.
export const pingDatabaseInDB = async (): Promise<void> => {
  await db().query("SELECT 1");
};
