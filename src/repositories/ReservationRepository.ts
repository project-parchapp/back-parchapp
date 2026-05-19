import type { Pool } from 'pg';
import type { ReservationRow, ReservationStatus } from '../models/types.js';

function mapRow(row: Record<string, unknown>): ReservationRow {
  return {
    id: String(row.id),
    establishment_id: String(row.establishment_id),
    tourist_user_id: String(row.tourist_user_id),
    reservation_date: row.reservation_date as Date,
    party_size: Number(row.party_size),
    status: row.status as ReservationStatus,
    note: row.note == null ? null : String(row.note),
    created_at: row.created_at as Date,
    updated_at: row.updated_at as Date,
  };
}

export class ReservationRepository {
  constructor(private readonly pool: Pool) {}

  async findByEstablishment(
    establishmentId: string,
    limit = 50,
    offset = 0
  ): Promise<ReservationRow[]> {
    const { rows } = await this.pool.query(
      `SELECT * FROM reservations
       WHERE establishment_id = $1
       ORDER BY reservation_date DESC
       LIMIT $2 OFFSET $3`,
      [establishmentId, limit, offset]
    );
    return rows.map((r) => mapRow(r as Record<string, unknown>));
  }

  async findByTourist(touristUserId: string): Promise<ReservationRow[]> {
    const { rows } = await this.pool.query(
      `SELECT * FROM reservations
       WHERE tourist_user_id = $1
       ORDER BY reservation_date DESC`,
      [touristUserId]
    );
    return rows.map((r) => mapRow(r as Record<string, unknown>));
  }

  async findById(id: string): Promise<ReservationRow | null> {
    const { rows } = await this.pool.query(
      `SELECT * FROM reservations WHERE id = $1`,
      [id]
    );
    return rows[0] ? mapRow(rows[0] as Record<string, unknown>) : null;
  }

  async create(input: {
    establishment_id: string;
    tourist_user_id: string;
    reservation_date: string;
    party_size: number;
    note?: string | null;
  }): Promise<ReservationRow> {
    const { rows } = await this.pool.query(
      `INSERT INTO reservations
        (establishment_id, tourist_user_id, reservation_date, party_size, note, status)
       VALUES ($1, $2, $3, $4, $5, 'pending')
       RETURNING *`,
      [
        input.establishment_id,
        input.tourist_user_id,
        input.reservation_date,
        input.party_size,
        input.note ?? null,
      ]
    );
    return mapRow(rows[0] as Record<string, unknown>);
  }

  async updateStatus(
    id: string,
    status: ReservationStatus
  ): Promise<ReservationRow | null> {
    const { rows } = await this.pool.query(
      `UPDATE reservations
       SET status = $2, updated_at = now()
       WHERE id = $1
       RETURNING *`,
      [id, status]
    );
    return rows[0] ? mapRow(rows[0] as Record<string, unknown>) : null;
  }
}
