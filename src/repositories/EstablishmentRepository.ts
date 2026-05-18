import type { Pool } from 'pg';
import type { EstablishmentRow, EstablishmentStatus } from '../models/types.js';

function mapEst(row: Record<string, unknown>): EstablishmentRow {
  return {
    id: String(row.id),
    owner_user_id: String(row.owner_user_id),
    legal_name: String(row.legal_name),
    trade_name: String(row.trade_name),
    description: row.description == null ? null : String(row.description),
    contact_email: row.contact_email == null ? null : String(row.contact_email),
    contact_phone: row.contact_phone == null ? null : String(row.contact_phone),
    website_url: row.website_url == null ? null : String(row.website_url),
    address_line: row.address_line == null ? null : String(row.address_line),
    city: String(row.city),
    country_code: String(row.country_code).trim(),
    latitude: String(row.latitude),
    longitude: String(row.longitude),
    status: row.status as EstablishmentStatus,
    created_at: row.created_at as Date,
    updated_at: row.updated_at as Date,
  };
}

export interface EstablishmentInput {
  owner_user_id: string;
  legal_name: string;
  trade_name: string;
  description?: string | null;
  contact_email?: string | null;
  contact_phone?: string | null;
  website_url?: string | null;
  address_line?: string | null;
  city: string;
  country_code: string;
  latitude: string;
  longitude: string;
  status?: EstablishmentStatus;
}

export class EstablishmentRepository {
  constructor(private readonly pool: Pool) {}

  async findAll(limit = 50, offset = 0): Promise<EstablishmentRow[]> {
    const { rows } = await this.pool.query(
      `SELECT id, owner_user_id, legal_name, trade_name, description, contact_email, contact_phone,
              website_url, address_line, city, country_code, latitude, longitude, status, created_at, updated_at
       FROM establishments ORDER BY id DESC LIMIT $1 OFFSET $2`,
      [limit, offset]
    );
    return rows.map((r) => mapEst(r as Record<string, unknown>));
  }

  async findById(id: string): Promise<EstablishmentRow | null> {
    const { rows } = await this.pool.query(
      `SELECT id, owner_user_id, legal_name, trade_name, description, contact_email, contact_phone,
              website_url, address_line, city, country_code, latitude, longitude, status, created_at, updated_at
       FROM establishments WHERE id = $1`,
      [id]
    );
    return rows[0] ? mapEst(rows[0] as Record<string, unknown>) : null;
  }

  async create(input: EstablishmentInput): Promise<EstablishmentRow> {
    const status = input.status ?? 'pending_review';
    const { rows } = await this.pool.query(
      `INSERT INTO establishments (
        owner_user_id, legal_name, trade_name, description, contact_email, contact_phone,
        website_url, address_line, city, country_code, latitude, longitude, status
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13::establishment_status)
      RETURNING id, owner_user_id, legal_name, trade_name, description, contact_email, contact_phone,
                website_url, address_line, city, country_code, latitude, longitude, status, created_at, updated_at`,
      [
        input.owner_user_id,
        input.legal_name,
        input.trade_name,
        input.description ?? null,
        input.contact_email ?? null,
        input.contact_phone ?? null,
        input.website_url ?? null,
        input.address_line ?? null,
        input.city,
        input.country_code,
        input.latitude,
        input.longitude,
        status,
      ]
    );
    return mapEst(rows[0] as Record<string, unknown>);
  }

  async update(
    id: string,
    patch: Partial<Omit<EstablishmentInput, 'owner_user_id'>> & { status?: EstablishmentStatus }
  ): Promise<EstablishmentRow | null> {
    const current = await this.findById(id);
    if (!current) return null;
    const merged = {
        legal_name: patch.legal_name ?? current.legal_name,
        trade_name: patch.trade_name ?? current.trade_name,
        description: patch.description !== undefined ? patch.description : current.description,
        contact_email: patch.contact_email !== undefined ? patch.contact_email : current.contact_email,
        contact_phone: patch.contact_phone !== undefined ? patch.contact_phone : current.contact_phone,
        website_url: patch.website_url !== undefined ? patch.website_url : current.website_url,
        address_line: patch.address_line !== undefined ? patch.address_line : current.address_line,
        city: patch.city ?? current.city,
        country_code: patch.country_code ?? current.country_code,
        latitude: patch.latitude ?? current.latitude,
        longitude: patch.longitude ?? current.longitude,
        status: patch.status ?? current.status,
      };
    const { rows } = await this.pool.query(
      `UPDATE establishments SET
        legal_name = $2, trade_name = $3, description = $4, contact_email = $5, contact_phone = $6,
        website_url = $7, address_line = $8, city = $9, country_code = $10, latitude = $11, longitude = $12,
        status = $13::establishment_status, updated_at = now()
       WHERE id = $1
       RETURNING id, owner_user_id, legal_name, trade_name, description, contact_email, contact_phone,
                 website_url, address_line, city, country_code, latitude, longitude, status, created_at, updated_at`,
      [
        id,
        merged.legal_name,
        merged.trade_name,
        merged.description,
        merged.contact_email,
        merged.contact_phone,
        merged.website_url,
        merged.address_line,
        merged.city,
        merged.country_code,
        merged.latitude,
        merged.longitude,
        merged.status,
      ]
    );
    return rows[0] ? mapEst(rows[0] as Record<string, unknown>) : null;
  }

  async delete(id: string): Promise<boolean> {
    const res = await this.pool.query(`DELETE FROM establishments WHERE id = $1`, [id]);
    return (res.rowCount ?? 0) > 0;
  }
}
