import type { UserRole } from '../models/types.js';

declare global {
  namespace Express {
    interface Request {
      authUser?: { userId: string; email: string; role: UserRole };
    }
  }
}

export {};
