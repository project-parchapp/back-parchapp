import { Router } from 'express';
import { z } from 'zod';
import { getRepositories } from '../container.js';
import { AuthService } from '../services/authService.js';
import { HttpError } from '../utils/httpError.js';
import { wrapAsync } from '../utils/wrapAsync.js';

export const authRouter = Router();

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

authRouter.post(
  '/auth/login',
  wrapAsync(async (req, res, next) => {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      next(new HttpError(400, 'Cuerpo inválido', parsed.error.flatten()));
      return;
    }
    const { users } = getRepositories();
    const auth = new AuthService(users);
    const out = await auth.login(parsed.data.email, parsed.data.password);
    res.json(out);
  })
);
