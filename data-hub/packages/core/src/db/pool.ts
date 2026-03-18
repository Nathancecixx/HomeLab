import { Pool } from "pg";

let pool: Pool | null = null;

export function createDbPool(connectionString: string) {
  return new Pool({
    connectionString,
    max: 10,
  });
}

export function getDbPool(connectionString: string) {
  if (!pool) {
    pool = createDbPool(connectionString);
  }

  return pool;
}

export async function closeDbPool() {
  if (!pool) {
    return;
  }

  await pool.end();
  pool = null;
}
