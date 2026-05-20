import { Router } from 'express';
import { z } from 'zod';
import { getRepositories } from '../container.js';
import { requireAuth } from '../middleware/auth.js';
import { HttpError } from '../utils/httpError.js';
import { wrapAsync } from '../utils/wrapAsync.js';

export const bookingsRouter = Router();

const createBookingSchema = z.object({
  party_size: z.number().int().min(1),
  notes: z.string().optional().nullable(),
});

bookingsRouter.post(
  '/services/:serviceId/bookings',
  requireAuth,
  wrapAsync(async (req, res, next) => {
    const parsed = createBookingSchema.safeParse(req.body);
    if (!parsed.success) {
      next(new HttpError(400, 'Cuerpo inválido', parsed.error.flatten()));
      return;
    }

    const uid = req.authUser!.userId;
    const { services, bookings } = getRepositories();
    const event = await services.findEventById(req.params.serviceId);
    if (!event) {
      next(new HttpError(404, 'Evento no encontrado'));
      return;
    }
    if (!event.is_active || event.establishment_status !== 'active') {
      next(new HttpError(400, 'El evento no está disponible'));
      return;
    }

    try {
      const booking = await bookings.createForEvent({
        service_id: req.params.serviceId,
        user_id: uid,
        ...parsed.data,
      });
      res.status(201).json(booking);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Error al reservar';
      if (msg.includes('Cupo insuficiente')) {
        next(new HttpError(409, msg));
        return;
      }
      next(new HttpError(400, msg));
    }
  })
);

bookingsRouter.get(
  '/bookings/me',
  requireAuth,
  wrapAsync(async (req, res) => {
    const { bookings } = getRepositories();
    const rows = await bookings.findByUser(req.authUser!.userId);
    res.json(rows);
  })
);

bookingsRouter.get(
  '/establishments/:id/bookings',
  requireAuth,
  wrapAsync(async (req, res, next) => {
    const uid = req.authUser!.userId;
    const { establishments, bookings } = getRepositories();
    const establishment = await establishments.findById(req.params.id);
    if (!establishment) {
      next(new HttpError(404, 'Establecimiento no encontrado'));
      return;
    }
    if (establishment.owner_user_id !== uid) {
      next(new HttpError(403, 'No autorizado'));
      return;
    }

    const limit = Math.min(Number(req.query.limit) || 50, 200);
    const offset = Math.max(Number(req.query.offset) || 0, 0);
    const rows = await bookings.findByEstablishment(
      req.params.id,
      limit,
      offset
    );
    res.json(rows);
  })
);

bookingsRouter.patch(
  '/bookings/:id/confirm',
  requireAuth,
  wrapAsync(async (req, res, next) => {
    const uid = req.authUser!.userId;
    const { bookings, services, establishments } = getRepositories();
    const booking = await bookings.findById(req.params.id);
    if (!booking) {
      next(new HttpError(404, 'Reserva no encontrada'));
      return;
    }

    const service = await services.findById(booking.service_id);
    if (!service) {
      next(new HttpError(404, 'Servicio no encontrado'));
      return;
    }
    const establishment = await establishments.findById(service.establishment_id);
    if (!establishment || establishment.owner_user_id !== uid) {
      next(new HttpError(403, 'No autorizado'));
      return;
    }

    try {
      const status = await bookings.confirmForEstablishment(req.params.id, uid);
      const updated = await bookings.findById(req.params.id);
      res.json({ ...updated, status });
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Error al confirmar';
      next(new HttpError(400, msg));
    }
  })
);

bookingsRouter.patch(
  '/bookings/:id/cancel',
  requireAuth,
  wrapAsync(async (req, res, next) => {
    const uid = req.authUser!.userId;
    const { bookings } = getRepositories();
    const booking = await bookings.findById(req.params.id);
    if (!booking) {
      next(new HttpError(404, 'Reserva no encontrada'));
      return;
    }
    if (booking.user_id !== uid) {
      next(new HttpError(403, 'No autorizado'));
      return;
    }

    try {
      const status = await bookings.cancelByTourist(req.params.id, uid);
      const updated = await bookings.findById(req.params.id);
      res.json({ ...updated, status });
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Error al cancelar';
      next(new HttpError(400, msg));
    }
  })
);
