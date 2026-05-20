import type { Pool } from 'pg';
import type { EstablishmentEventRow, ServiceRow } from '../models/types.js';

function mapServiceRow(row: Record<string, unknown>): ServiceRow {
  return {
    id: String(row.id),
    establishment_id: String(row.establishment_id),
    title: String(row.title),
    description: row.description == null ? null : String(row.description),
    service_kind: String(row.service_kind),
    duration_minutes:
      row.duration_minutes == null ? null : Number(row.duration_minutes),
    base_price_amount:
      row.base_price_amount == null ? null : String(row.base_price_amount),
    currency_code: String(row.currency_code),
    max_party_size:
      row.max_party_size == null ? null : Number(row.max_party_size),
    is_bookable: Boolean(row.is_bookable),
    is_active: Boolean(row.is_active),
    created_at: row.created_at as Date,
    updated_at: row.updated_at as Date,
  };
}

function mapEventRow(row: Record<string, unknown>): EstablishmentEventRow {
  return {
    service_id: String(row.service_id),
    establishment_id: String(row.establishment_id),
    title: String(row.title),
    description: row.description == null ? null : String(row.description),
    duration_minutes:
      row.duration_minutes == null ? null : Number(row.duration_minutes),
    max_party_size:
      row.max_party_size == null ? null : Number(row.max_party_size),
    is_active: Boolean(row.is_active),
    service_created_at: row.service_created_at as Date,
    establishment_trade_name: String(row.establishment_trade_name),
    establishment_status: row.establishment_status as EstablishmentEventRow['establishment_status'],
    anchor_booking_id:
      row.anchor_booking_id == null ? null : String(row.anchor_booking_id),
    scheduled_start:
      row.scheduled_start == null ? null : (row.scheduled_start as Date),
    scheduled_end: row.scheduled_end == null ? null : (row.scheduled_end as Date),
    booked_party_size: Number(row.booked_party_size ?? 0),
    spots_available: Number(row.spots_available ?? 0),
  };
}

export class ServiceRepository {
  constructor(private readonly pool: Pool) {}

  async findEventsByEstablishment(
    establishmentId: string,
    activeOnly = true
  ): Promise<EstablishmentEventRow[]> {
    const { rows } = await this.pool.query(
      `SELECT *
       FROM v_establishment_events
       WHERE establishment_id = $1
         AND ($2::boolean = false OR is_active = true)
       ORDER BY scheduled_start ASC NULLS LAST, service_created_at DESC`,
      [establishmentId, activeOnly]
    );
    return rows.map((r) => mapEventRow(r as Record<string, unknown>));
  }

  async findBookableEvents(
    limit = 50,
    offset = 0
  ): Promise<EstablishmentEventRow[]> {
    const { rows } = await this.pool.query(
      `SELECT *
       FROM v_establishment_events
       WHERE is_active = true
         AND establishment_status = 'active'
         AND spots_available > 0
         AND scheduled_start IS NOT NULL
         AND scheduled_start > NOW()
       ORDER BY scheduled_start ASC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );
    return rows.map((r) => mapEventRow(r as Record<string, unknown>));
  }

  async findEventById(serviceId: string): Promise<EstablishmentEventRow | null> {
    const { rows } = await this.pool.query(
      `SELECT * FROM v_establishment_events WHERE service_id = $1`,
      [serviceId]
    );
    return rows[0] ? mapEventRow(rows[0] as Record<string, unknown>) : null;
  }

  async findById(serviceId: string): Promise<ServiceRow | null> {
    const { rows } = await this.pool.query(
      `SELECT id, establishment_id, title, description, service_kind,
              duration_minutes, base_price_amount, currency_code, max_party_size,
              is_bookable, is_active, created_at, updated_at
       FROM services WHERE id = $1`,
      [serviceId]
    );
    return rows[0] ? mapServiceRow(rows[0] as Record<string, unknown>) : null;
  }

  async createEstablishmentEvent(input: {
    establishment_id: string;
    actor_user_id: string;
    title: string;
    description?: string | null;
    scheduled_start: string;
    duration_minutes: number;
    party_size: number;
    max_party_size?: number | null;
    notes?: string | null;
  }): Promise<{ service_id: string; booking_id: string }> {
    const { rows } = await this.pool.query(
      `SELECT out_service_id, out_booking_id
       FROM fn_create_establishment_event($1, $2, $3, $4, $5::timestamptz, $6, $7, $8, $9)`,
      [
        input.establishment_id,
        input.actor_user_id,
        input.title,
        input.description ?? null,
        input.scheduled_start,
        input.duration_minutes,
        input.party_size,
        input.max_party_size ?? null,
        input.notes ?? null,
      ]
    );
    const row = rows[0] as Record<string, unknown>;
    return {
      service_id: String(row.out_service_id),
      booking_id: String(row.out_booking_id),
    };
  }
}
