import type { Pool } from 'pg';
import type {
  BookingRow,
  BookingStatus,
  EstablishmentBookingViewRow,
} from '../models/types.js';

function mapBookingRow(row: Record<string, unknown>): BookingRow {
  return {
    id: String(row.id),
    user_id: String(row.user_id),
    service_id: String(row.service_id),
    route_id: row.route_id == null ? null : String(row.route_id),
    party_size: Number(row.party_size),
    scheduled_start: row.scheduled_start as Date,
    scheduled_end: row.scheduled_end == null ? null : (row.scheduled_end as Date),
    status: row.status as BookingStatus,
    notes: row.notes == null ? null : String(row.notes),
    created_at: row.created_at as Date,
    updated_at: row.updated_at as Date,
  };
}

function mapEstablishmentBooking(
  row: Record<string, unknown>
): EstablishmentBookingViewRow {
  return {
    booking_id: String(row.booking_id),
    status: row.status as BookingStatus,
    party_size: Number(row.party_size),
    scheduled_start: row.scheduled_start as Date,
    scheduled_end: row.scheduled_end == null ? null : (row.scheduled_end as Date),
    notes: row.notes == null ? null : String(row.notes),
    created_at: row.created_at as Date,
    service_id: String(row.service_id),
    service_title: String(row.service_title),
    establishment_id: String(row.establishment_id),
    trade_name: String(row.trade_name),
    tourist_user_id: String(row.tourist_user_id),
    tourist_display_name: String(row.tourist_display_name),
    tourist_email: String(row.tourist_email),
  };
}

export class BookingRepository {
  constructor(private readonly pool: Pool) {}

  async findById(id: string): Promise<BookingRow | null> {
    const { rows } = await this.pool.query(
      `SELECT id, user_id, service_id, route_id, party_size,
              scheduled_start, scheduled_end, status, notes, created_at, updated_at
       FROM bookings WHERE id = $1`,
      [id]
    );
    return rows[0] ? mapBookingRow(rows[0] as Record<string, unknown>) : null;
  }

  async findByUser(userId: string): Promise<BookingRow[]> {
    const { rows } = await this.pool.query(
      `SELECT id, user_id, service_id, route_id, party_size,
              scheduled_start, scheduled_end, status, notes, created_at, updated_at
       FROM bookings
       WHERE user_id = $1
       ORDER BY scheduled_start DESC`,
      [userId]
    );
    return rows.map((r) => mapBookingRow(r as Record<string, unknown>));
  }

  async findByEstablishment(
    establishmentId: string,
    limit = 50,
    offset = 0
  ): Promise<EstablishmentBookingViewRow[]> {
    const { rows } = await this.pool.query(
      `SELECT *
       FROM v_bookings_for_establishment
       WHERE establishment_id = $1
       ORDER BY scheduled_start DESC
       LIMIT $2 OFFSET $3`,
      [establishmentId, limit, offset]
    );
    return rows.map((r) =>
      mapEstablishmentBooking(r as Record<string, unknown>)
    );
  }

  async createForEvent(input: {
    service_id: string;
    user_id: string;
    party_size: number;
    notes?: string | null;
  }): Promise<BookingRow> {
    const { rows } = await this.pool.query(
      `SELECT fn_create_booking_for_event($1, $2, $3, $4) AS booking_id`,
      [
        input.service_id,
        input.user_id,
        input.party_size,
        input.notes ?? null,
      ]
    );
    const bookingId = String(
      (rows[0] as Record<string, unknown>).booking_id
    );
    const booking = await this.findById(bookingId);
    if (!booking) {
      throw new Error('Reserva creada pero no encontrada');
    }
    return booking;
  }

  async confirmForEstablishment(
    bookingId: string,
    actorUserId: string
  ): Promise<BookingStatus> {
    const { rows } = await this.pool.query(
      `SELECT fn_confirm_booking_for_establishment($1, $2) AS status`,
      [bookingId, actorUserId]
    );
    return (rows[0] as Record<string, unknown>).status as BookingStatus;
  }

  async cancelByTourist(
    bookingId: string,
    touristUserId: string
  ): Promise<BookingStatus> {
    const { rows } = await this.pool.query(
      `SELECT fn_cancel_booking_by_tourist($1, $2) AS status`,
      [bookingId, touristUserId]
    );
    return (rows[0] as Record<string, unknown>).status as BookingStatus;
  }
}
