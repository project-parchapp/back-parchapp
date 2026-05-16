import type { Pool } from 'pg';
import type { UserRow } from '../models/types.js';

function mapUser(row: Record<string, unknown>): UserRow {
  return {
    id: String(row.id),
    email: String(row.email),
    password_hash: String(row.password_hash),
    display_name: String(row.display_name),
    phone: row.phone == null ? null : String(row.phone),
    avatar_url: row.avatar_url == null ? null : String(row.avatar_url),
    role: row.role as UserRow['role'],
    is_active: Boolean(row.is_active),
    created_at: row.created_at as Date,
    updated_at: row.updated_at as Date,
  };
}

export class UserRepository {
  constructor(private readonly pool: Pool) {}

  async findByEmail(email: string): Promise<UserRow | null> {
    const { rows } = await this.pool.query(
      `SELECT id, email, password_hash, display_name, phone, avatar_url, role, is_active, created_at, updated_at
       FROM users WHERE lower(email) = lower($1) LIMIT 1`,
      [email]
    );
    return rows[0] ? mapUser(rows[0] as Record<string, unknown>) : null;
  }

  async findById(id: string): Promise<UserRow | null> {
    const { rows } = await this.pool.query(
      `SELECT id, email, password_hash, display_name, phone, avatar_url, role, is_active, created_at, updated_at
       FROM users WHERE id = $1`,
      [id]
    );
    return rows[0] ? mapUser(rows[0] as Record<string, unknown>) : null;
  }
}
