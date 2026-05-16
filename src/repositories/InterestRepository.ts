import type { Pool } from 'pg';
import type { InterestRow } from '../models/types.js';

function mapInterest(row: Record<string, unknown>): InterestRow {
  return {
    id: String(row.id),
    code: String(row.code),
    name: String(row.name),
    description: row.description == null ? null : String(row.description),
    sort_order: Number(row.sort_order),
    created_at: row.created_at as Date,
  };
}

export class InterestRepository {
  constructor(private readonly pool: Pool) {}

  async findAll(): Promise<InterestRow[]> {
    const { rows } = await this.pool.query(
      `SELECT id, code, name, description, sort_order, created_at
       FROM interests ORDER BY sort_order, id`
    );
    return rows.map((r) => mapInterest(r as Record<string, unknown>));
  }
}
