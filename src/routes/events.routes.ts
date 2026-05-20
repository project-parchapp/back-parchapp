import { Router } from 'express';
import { z } from 'zod';
import { getRepositories } from '../container.js';
import { requireAuth } from '../middleware/auth.js';
import { HttpError } from '../utils/httpError.js';
import { wrapAsync } from '../utils/wrapAsync.js';

export const eventsRouter = Router();

const createEventSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().optional().nullable(),
  scheduled_start: z.string().min(1),
  duration_minutes: z.number().int().min(1),
  party_size: z.number().int().min(1).default(1),
  max_party_size: z.number().int().min(1).optional().nullable(),
  notes: z.string().optional().nullable(),
});

eventsRouter.get(
  '/events',
  wrapAsync(async (req, res) => {
    const limit = Math.min(Number(req.query.limit) || 50, 200);
    const offset = Math.max(Number(req.query.offset) || 0, 0);
    const { services } = getRepositories();
    const rows = await services.findBookableEvents(limit, offset);
    res.json(rows);
  })
);

eventsRouter.get(
  '/establishments/:id/events',
  wrapAsync(async (req, res) => {
    const activeOnly = req.query.active !== 'false';
    const { services } = getRepositories();
    const rows = await services.findEventsByEstablishment(
      req.params.id,
      activeOnly
    );
    res.json(rows);
  })
);

eventsRouter.post(
  '/establishments/:id/events',
  requireAuth,
  wrapAsync(async (req, res, next) => {
    const parsed = createEventSchema.safeParse(req.body);
    if (!parsed.success) {
      next(new HttpError(400, 'Cuerpo inválido', parsed.error.flatten()));
      return;
    }

    const uid = req.authUser!.userId;
    const { establishments, services, bookings } = getRepositories();
    const establishment = await establishments.findById(req.params.id);
    if (!establishment) {
      next(new HttpError(404, 'Establecimiento no encontrado'));
      return;
    }
    if (establishment.owner_user_id !== uid) {
      next(new HttpError(403, 'Solo el dueño puede crear eventos'));
      return;
    }

    try {
      const { service_id, booking_id } = await services.createEstablishmentEvent({
        establishment_id: req.params.id,
        actor_user_id: uid,
        ...parsed.data,
      });
      const service = await services.findById(service_id);
      const booking = await bookings.findById(booking_id);
      if (!service || !booking) {
        next(new HttpError(500, 'Evento creado pero no se pudo recuperar'));
        return;
      }
      res.status(201).json({ service_id, booking_id, service, booking });
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Error al crear evento';
      if (msg.includes('no autorizado') || msg.includes('no está activo')) {
        next(new HttpError(403, msg));
        return;
      }
      next(new HttpError(400, msg));
    }
  })
);

eventsRouter.get(
  '/events/:serviceId',
  wrapAsync(async (req, res, next) => {
    const { services } = getRepositories();
    const event = await services.findEventById(req.params.serviceId);
    if (!event) {
      next(new HttpError(404, 'Evento no encontrado'));
      return;
    }
    res.json(event);
  })
);
