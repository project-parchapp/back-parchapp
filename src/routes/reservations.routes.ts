import { Router } from 'express';
import { z } from 'zod';
import { getRepositories } from '../container.js';
import { requireAuth } from '../middleware/auth.js';
import { HttpError } from '../utils/httpError.js';
import { wrapAsync } from '../utils/wrapAsync.js';

export const reservationsRouter = Router();

// POST /reservations — turista crea una reserva
reservationsRouter.post(
  '/reservations',
  requireAuth,
  wrapAsync(async (req, res, next) => {
    const schema = z.object({
      establishment_id: z.string().min(1),
      reservation_date: z.string().min(1),
      party_size: z.number().int().min(1),
      note: z.string().optional().nullable(),
    });

    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      next(new HttpError(400, 'Cuerpo inválido', parsed.error.flatten()));
      return;
    }

    const { reservations } = getRepositories();
    const reservation = await reservations.create({
      ...parsed.data,
      tourist_user_id: req.authUser!.userId,
    });

    res.status(201).json(reservation);
  })
);

// GET /reservations/my — turista ve sus reservas
reservationsRouter.get(
  '/reservations/my',
  requireAuth,
  wrapAsync(async (req, res) => {
    const { reservations } = getRepositories();
    const result = await reservations.findByTourist(req.authUser!.userId);
    res.json(result);
  })
);

// GET /reservations?establishment_id=xxx — establecimiento ve sus reservas
reservationsRouter.get(
  '/reservations',
  requireAuth,
  wrapAsync(async (req, res, next) => {
    const establishmentId = req.query['establishment_id'] as string | undefined;
    if (!establishmentId) {
      next(new HttpError(400, 'establishment_id es requerido'));
      return;
    }

    const limit = Number(req.query['limit'] ?? 50);
    const offset = Number(req.query['offset'] ?? 0);

    const { reservations } = getRepositories();
    const result = await reservations.findByEstablishment(
      establishmentId,
      limit,
      offset
    );
    res.json(result);
  })
);

// PATCH /reservations/:id — establecimiento confirma o cancela
reservationsRouter.patch(
  '/reservations/:id',
  requireAuth,
  wrapAsync(async (req, res, next) => {
    const schema = z.object({
      status: z.enum(['confirmed', 'cancelled']),
    });

    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      next(new HttpError(400, 'Estado inválido', parsed.error.flatten()));
      return;
    }

    const { reservations } = getRepositories();
    const updated = await reservations.updateStatus(
      req.params['id']!,
      parsed.data.status
    );

    if (!updated) {
      next(new HttpError(404, 'Reserva no encontrada'));
      return;
    }

    res.json(updated);
  })
);
