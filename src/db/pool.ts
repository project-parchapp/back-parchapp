import pg from 'pg';
import { getEnv } from '../config/env.js';

const { Pool } = pg;

let pool: pg.Pool | null = null;

export function getPool(): pg.Pool {
  if (!pool) {
    const { DATABASE_URL } = getEnv();
    pool = new Pool({ connectionString: DATABASE_URL, max: 10 });
  }
  return pool;
}

export async function checkDb(): Promise<boolean> {
  const client = await getPool().connect();
  try {
    await client.query('SELECT 1');
    return true;
  } finally {
    client.release();
  }
}
