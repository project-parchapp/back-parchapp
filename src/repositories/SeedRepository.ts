import { createReadStream } from 'node:fs';
import { join } from 'node:path';
import { pipeline } from 'node:stream/promises';
import type { Writable } from 'node:stream';
import type { Pool, PoolClient } from 'pg';
import { from as copyFrom } from 'pg-copy-streams';

const SEED_FILES: { table: string; file: string }[] = [
  { table: 'stg_seed_places', file: 'lugares.csv' },
  { table: 'stg_seed_restaurants', file: 'restaurantes.csv' },
  { table: 'stg_seed_routes', file: 'rutas.csv' },
  { table: 'stg_seed_route_stops', file: 'ruta_paradas.csv' },
];

async function copyCsvFile(client: PoolClient, table: string, csvPath: string): Promise<void> {
  const sql = `COPY ${table} FROM STDIN WITH (FORMAT csv, HEADER true)`;
  const copyStream = client.query(copyFrom(sql)) as unknown as Writable;
  await pipeline(createReadStream(csvPath), copyStream);
}

export class SeedRepository {
  constructor(
    private readonly pool: Pool,
    private readonly csvDir: string
  ) {}

  async runPopulateFromCsv(): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(`DELETE FROM stg_seed_route_stops`);
      await client.query(`DELETE FROM stg_seed_routes`);
      await client.query(`DELETE FROM stg_seed_restaurants`);
      await client.query(`DELETE FROM stg_seed_places`);
      for (const { table, file } of SEED_FILES) {
        const fullPath = join(this.csvDir, file);
        await copyCsvFile(client, table, fullPath);
      }
      await client.query('CALL sp_populate_from_seed_staging()');
      await client.query('COMMIT');
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  }
}
