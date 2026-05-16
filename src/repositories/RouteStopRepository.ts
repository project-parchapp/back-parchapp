import type { Pool } from 'pg';
import type { RouteStopRow } from '../models/types.js';

function mapStop(row: Record<string, unknown>): RouteStopRow {
  return {
    id: String(row.id),
    route_id: String(row.route_id),
    establishment_id: String(row.establishment_id),
    service_id: row.service_id == null ? null : String(row.service_id),
    sort_order: Number(row.sort_order),
    estimated_travel_minutes_from_prev: Number(row.estimated_travel_minutes_from_prev),
    estimated_stay_minutes:
      row.estimated_stay_minutes == null ? null : Number(row.estimated_stay_minutes),
    latitude: String(row.latitude),
    longitude: String(row.longitude),
    note: row.note == null ? null : String(row.note),
  };
}

export interface RouteStopInput {
  establishment_id: string;
  service_id?: string | null;
  sort_order: number;
  estimated_travel_minutes_from_prev?: number;
  estimated_stay_minutes?: number | null;
  latitude: string;
  longitude: string;
  note?: string | null;
}

export class RouteStopRepository {
  constructor(private readonly pool: Pool) {}

  async findByRouteId(routeId: string): Promise<RouteStopRow[]> {
    const { rows } = await this.pool.query(
      `SELECT id, route_id, establishment_id, service_id, sort_order,
              estimated_travel_minutes_from_prev, estimated_stay_minutes, latitude, longitude, note
       FROM route_stops WHERE route_id = $1 ORDER BY sort_order`,
      [routeId]
    );
    return rows.map((r) => mapStop(r as Record<string, unknown>));
  }

  async create(routeId: string, input: RouteStopInput): Promise<RouteStopRow> {
    const travel = input.estimated_travel_minutes_from_prev ?? 0;
    const { rows } = await this.pool.query(
      `INSERT INTO route_stops (
        route_id, establishment_id, service_id, sort_order,
        estimated_travel_minutes_from_prev, estimated_stay_minutes, latitude, longitude, note
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
      RETURNING id, route_id, establishment_id, service_id, sort_order,
                estimated_travel_minutes_from_prev, estimated_stay_minutes, latitude, longitude, note`,
      [
        routeId,
        input.establishment_id,
        input.service_id ?? null,
        input.sort_order,
        travel,
        input.estimated_stay_minutes ?? null,
        input.latitude,
        input.longitude,
        input.note ?? null,
      ]
    );
    return mapStop(rows[0] as Record<string, unknown>);
  }

  async update(
    routeId: string,
    stopId: string,
    patch: Partial<RouteStopInput>
  ): Promise<RouteStopRow | null> {
    const { rows: curRows } = await this.pool.query(
      `SELECT * FROM route_stops WHERE id = $1 AND route_id = $2`,
      [stopId, routeId]
    );
    if (!curRows[0]) return null;
    const cur = mapStop(curRows[0] as Record<string, unknown>);
    const merged = {
      establishment_id: patch.establishment_id ?? cur.establishment_id,
      service_id: patch.service_id !== undefined ? patch.service_id : cur.service_id,
      sort_order: patch.sort_order ?? cur.sort_order,
      estimated_travel_minutes_from_prev:
        patch.estimated_travel_minutes_from_prev ?? cur.estimated_travel_minutes_from_prev,
      estimated_stay_minutes:
        patch.estimated_stay_minutes !== undefined ? patch.estimated_stay_minutes : cur.estimated_stay_minutes,
      latitude: patch.latitude ?? cur.latitude,
      longitude: patch.longitude ?? cur.longitude,
      note: patch.note !== undefined ? patch.note : cur.note,
    };
    const { rows } = await this.pool.query(
      `UPDATE route_stops SET
        establishment_id = $3, service_id = $4, sort_order = $5,
        estimated_travel_minutes_from_prev = $6, estimated_stay_minutes = $7,
        latitude = $8, longitude = $9, note = $10
       WHERE id = $1 AND route_id = $2
       RETURNING id, route_id, establishment_id, service_id, sort_order,
                 estimated_travel_minutes_from_prev, estimated_stay_minutes, latitude, longitude, note`,
      [
        stopId,
        routeId,
        merged.establishment_id,
        merged.service_id,
        merged.sort_order,
        merged.estimated_travel_minutes_from_prev,
        merged.estimated_stay_minutes,
        merged.latitude,
        merged.longitude,
        merged.note,
      ]
    );
    return rows[0] ? mapStop(rows[0] as Record<string, unknown>) : null;
  }

  async delete(routeId: string, stopId: string): Promise<boolean> {
    const res = await this.pool.query(`DELETE FROM route_stops WHERE id = $1 AND route_id = $2`, [
      stopId,
      routeId,
    ]);
    return (res.rowCount ?? 0) > 0;
  }
}
