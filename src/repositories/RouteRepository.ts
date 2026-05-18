import type { Pool } from 'pg';
import type { RouteRow, RouteStatus } from '../models/types.js';

function mapRoute(row: Record<string, unknown>): RouteRow {
  return {
    id: String(row.id),
    user_id: String(row.user_id),
    name: String(row.name),
    description: row.description == null ? null : String(row.description),
    status: row.status as RouteStatus,
    total_estimated_minutes:
      row.total_estimated_minutes == null ? null : Number(row.total_estimated_minutes),
    origin_latitude: row.origin_latitude == null ? null : String(row.origin_latitude),
    origin_longitude: row.origin_longitude == null ? null : String(row.origin_longitude),
    generation_context: row.generation_context,
    created_at: row.created_at as Date,
    updated_at: row.updated_at as Date,
  };
}

export interface RouteInput {
  user_id: string;
  name: string;
  description?: string | null;
  status?: RouteStatus;
  total_estimated_minutes?: number | null;
  origin_latitude?: string | null;
  origin_longitude?: string | null;
  generation_context?: unknown;
}

export class RouteRepository {
  constructor(private readonly pool: Pool) {}

  async findByUserId(userId: string, limit = 50, offset = 0): Promise<RouteRow[]> {
    const { rows } = await this.pool.query(
      `SELECT id, user_id, name, description, status, total_estimated_minutes,
              origin_latitude, origin_longitude, generation_context, created_at, updated_at
       FROM routes WHERE user_id = $1 ORDER BY id DESC LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    );
    return rows.map((r) => mapRoute(r as Record<string, unknown>));
  }

  async findByIdAndUser(id: string, userId: string): Promise<RouteRow | null> {
    const { rows } = await this.pool.query(
      `SELECT id, user_id, name, description, status, total_estimated_minutes,
              origin_latitude, origin_longitude, generation_context, created_at, updated_at
       FROM routes WHERE id = $1 AND user_id = $2`,
      [id, userId]
    );
    return rows[0] ? mapRoute(rows[0] as Record<string, unknown>) : null;
  }

  async create(input: RouteInput): Promise<RouteRow> {
    const status = input.status ?? 'draft';
    const { rows } = await this.pool.query(
      `INSERT INTO routes (
        user_id, name, description, status, total_estimated_minutes,
        origin_latitude, origin_longitude, generation_context
      ) VALUES ($1,$2,$3,$4::route_status,$5,$6,$7,$8::jsonb)
      RETURNING id, user_id, name, description, status, total_estimated_minutes,
                origin_latitude, origin_longitude, generation_context, created_at, updated_at`,
      [
        input.user_id,
        input.name,
        input.description ?? null,
        status,
        input.total_estimated_minutes ?? null,
        input.origin_latitude ?? null,
        input.origin_longitude ?? null,
        JSON.stringify(input.generation_context ?? {}),
      ]
    );
    return mapRoute(rows[0] as Record<string, unknown>);
  }

  async update(
    id: string,
    userId: string,
    patch: Partial<Pick<RouteInput, 'name' | 'description' | 'status' | 'total_estimated_minutes' | 'origin_latitude' | 'origin_longitude' | 'generation_context'>>
  ): Promise<RouteRow | null> {
    const current = await this.findByIdAndUser(id, userId);
    if (!current) return null;
    const merged = {
      name: patch.name ?? current.name,
      description: patch.description !== undefined ? patch.description : current.description,
      status: patch.status ?? current.status,
      total_estimated_minutes:
        patch.total_estimated_minutes !== undefined
          ? patch.total_estimated_minutes
          : current.total_estimated_minutes,
      origin_latitude:
        patch.origin_latitude !== undefined ? patch.origin_latitude : current.origin_latitude,
      origin_longitude:
        patch.origin_longitude !== undefined ? patch.origin_longitude : current.origin_longitude,
      generation_context:
        patch.generation_context !== undefined ? patch.generation_context : current.generation_context,
    };
    const { rows } = await this.pool.query(
      `UPDATE routes SET
        name = $3, description = $4, status = $5::route_status, total_estimated_minutes = $6,
        origin_latitude = $7, origin_longitude = $8, generation_context = $9::jsonb, updated_at = now()
       WHERE id = $1 AND user_id = $2
       RETURNING id, user_id, name, description, status, total_estimated_minutes,
                 origin_latitude, origin_longitude, generation_context, created_at, updated_at`,
      [
        id,
        userId,
        merged.name,
        merged.description,
        merged.status,
        merged.total_estimated_minutes,
        merged.origin_latitude,
        merged.origin_longitude,
        JSON.stringify(merged.generation_context ?? {}),
      ]
    );
    return rows[0] ? mapRoute(rows[0] as Record<string, unknown>) : null;
  }

  async delete(id: string, userId: string): Promise<boolean> {
    const res = await this.pool.query(`DELETE FROM routes WHERE id = $1 AND user_id = $2`, [id, userId]);
    return (res.rowCount ?? 0) > 0;
  }
}
