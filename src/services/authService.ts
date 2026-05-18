import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { getEnv } from '../config/env.js';
import type { UserRow } from '../models/types.js';
import { UserRepository } from '../repositories/UserRepository.js';
import { HttpError } from '../utils/httpError.js';

export class AuthService {
  constructor(private readonly users: UserRepository) {}

  async login(
    email: string,
    password: string
  ): Promise<{
    token: string;
    user: Pick<UserRow, 'id' | 'email' | 'display_name' | 'phone' | 'avatar_url' | 'role' | 'is_active' | 'created_at' | 'updated_at'>;
  }> {
    const user = await this.users.findByEmail(email.trim());
    if (!user || !user.is_active) {
      throw new HttpError(401, 'Credenciales inválidas');
    }
    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) {
      throw new HttpError(401, 'Credenciales inválidas');
    }
    const token = jwt.sign(
      { sub: user.id, email: user.email, role: user.role },
      getEnv().JWT_SECRET,
      { expiresIn: '7d' }
    );
    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        display_name: user.display_name,
        phone: user.phone,
        avatar_url: user.avatar_url,
        role: user.role,
        is_active: user.is_active,
        created_at: user.created_at,
        updated_at: user.updated_at,
      },
    };
  }
}
