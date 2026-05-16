import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { getEnv } from '../config/env.js';
import type { UserRole } from '../models/types.js';
import { HttpError } from '../utils/httpError.js';

export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    next(new HttpError(401, 'Se requiere token Bearer'));
    return;
  }
  const token = header.slice('Bearer '.length).trim();
  try {
    const payload = jwt.verify(token, getEnv().JWT_SECRET) as {
      sub: string;
      email: string;
      role: UserRole;
    };
    req.authUser = {
      userId: String(payload.sub),
      email: payload.email,
      role: payload.role,
    };
    next();
  } catch {
    next(new HttpError(401, 'Token inválido o expirado'));
  }
}
