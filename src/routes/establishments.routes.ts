import { Router } from 'express';
import { z } from 'zod';
import { getRepositories } from '../container.js';
import { requireAuth } from '../middleware/auth.js';
import { HttpError } from '../utils/httpError.js';
import { wrapAsync } from '../utils/wrapAsync.js';

export const establishmentsRouter = Router();

const createSchema = z.object({
  legal_name: z.string().min(1).max(255),
  trade_name: z.string().min(1).max(255),
  description: z.string().optional().nullable(),
  contact_email: z.union([z.string().email(), z.null()]).optional(),
  contact_phone: z.string().max(40).optional().nullable(),
  website_url: z.string().max(2000).optional().nullable(),
  address_line: z.string().optional().nullable(),
  city: z.string().min(1).max(120),
  country_code: z.string().length(2),
  latitude: z.string().or(z.number()).transform(String),
  longitude: z.string().or(z.number()).transform(String),
  status: z.enum(['pending_review', 'active', 'suspended', 'closed']).optional(),
});

const patchSchema = createSchema.partial();

establishmentsRouter.get(
  '/establishments',
  wrapAsync(async (req, res) => {
    const limit = Math.min(Number(req.query.limit) || 50, 200);
    const offset = Math.max(Number(req.query.offset) || 0, 0);
    const { establishments } = getRepositories();
    const rows = await establishments.findAll(limit, offset);
    res.json(rows);
  })
);

establishmentsRouter.get(
  '/establishments/:id',
  wrapAsync(async (req, res, next) => {
    const { establishments } = getRepositories();
    const row = await establishments.findById(req.params.id);
    if (!row) {
      next(new HttpError(404, 'Establecimiento no encontrado'));
      return;
    }
    res.json(row);
  })
);

establishmentsRouter.post(
  '/establishments',
  requireAuth,
  wrapAsync(async (req, res, next) => {
    const parsed = createSchema.safeParse(req.body);
    if (!parsed.success) {
      next(new HttpError(400, 'Cuerpo inválido', parsed.error.flatten()));
      return;
    }
    const uid = req.authUser?.userId;
    if (!uid) {
      next(new HttpError(401, 'No autenticado'));
      return;
    }
    const { establishments } = getRepositories();
    const row = await establishments.create({
      owner_user_id: uid,
      ...parsed.data,
    });
    res.status(201).json(row);
  })
);

establishmentsRouter.patch(
  '/establishments/:id',
  requireAuth,
  wrapAsync(async (req, res, next) => {
    const parsed = patchSchema.safeParse(req.body);
    if (!parsed.success) {
      next(new HttpError(400, 'Cuerpo inválido', parsed.error.flatten()));
      return;
    }
    const uid = req.authUser?.userId;
    if (!uid) {
      next(new HttpError(401, 'No autenticado'));
      return;
    }
    const { establishments } = getRepositories();
    const existing = await establishments.findById(req.params.id);
    if (!existing) {
      next(new HttpError(404, 'Establecimiento no encontrado'));
      return;
    }
    if (existing.owner_user_id !== uid) {
      next(new HttpError(403, 'No autorizado'));
      return;
    }
    const row = await establishments.update(req.params.id, parsed.data);
    res.json(row);
  })
);

establishmentsRouter.delete(
  '/establishments/:id',
  requireAuth,
  wrapAsync(async (req, res, next) => {
    const uid = req.authUser?.userId;
    if (!uid) {
      next(new HttpError(401, 'No autenticado'));
      return;
    }
    const { establishments } = getRepositories();
    const existing = await establishments.findById(req.params.id);
    if (!existing) {
      next(new HttpError(404, 'Establecimiento no encontrado'));
      return;
    }
    if (existing.owner_user_id !== uid) {
      next(new HttpError(403, 'No autorizado'));
      return;
    }
    await establishments.delete(req.params.id);
    res.status(204).send();
  })
);
