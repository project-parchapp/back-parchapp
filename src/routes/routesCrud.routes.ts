import { Router } from 'express';
import { z } from 'zod';
import { getRepositories } from '../container.js';
import { requireAuth } from '../middleware/auth.js';
import { HttpError } from '../utils/httpError.js';
import { wrapAsync } from '../utils/wrapAsync.js';

export const routesCrudRouter = Router();

const routeCreateSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().optional().nullable(),
  status: z.enum(['draft', 'saved', 'completed', 'archived']).optional(),
  total_estimated_minutes: z.number().int().optional().nullable(),
  origin_latitude: z.string().or(z.number()).optional().nullable().transform((v) => (v == null ? null : String(v))),
  origin_longitude: z.string().or(z.number()).optional().nullable().transform((v) => (v == null ? null : String(v))),
  generation_context: z.unknown().optional(),
});

const routePatchSchema = routeCreateSchema.partial();

const stopCreateSchema = z.object({
  establishment_id: z.string().min(1),
  service_id: z.string().optional().nullable(),
  sort_order: z.number().int(),
  estimated_travel_minutes_from_prev: z.number().int().optional(),
  estimated_stay_minutes: z.number().int().optional().nullable(),
  latitude: z.string().or(z.number()).transform(String),
  longitude: z.string().or(z.number()).transform(String),
  note: z.string().max(500).optional().nullable(),
});

const stopPatchSchema = stopCreateSchema.partial();

routesCrudRouter.use(requireAuth);

routesCrudRouter.get(
  '/routes',
  wrapAsync(async (req, res) => {
    const uid = req.authUser!.userId;
    const limit = Math.min(Number(req.query.limit) || 50, 200);
    const offset = Math.max(Number(req.query.offset) || 0, 0);
    const { routes } = getRepositories();
    const rows = await routes.findByUserId(uid, limit, offset);
    res.json(rows);
  })
);

routesCrudRouter.post(
  '/routes',
  wrapAsync(async (req, res, next) => {
    const parsed = routeCreateSchema.safeParse(req.body);
    if (!parsed.success) {
      next(new HttpError(400, 'Cuerpo inválido', parsed.error.flatten()));
      return;
    }
    const uid = req.authUser!.userId;
    const { routes } = getRepositories();
    const row = await routes.create({ user_id: uid, ...parsed.data });
    res.status(201).json(row);
  })
);

routesCrudRouter.get(
  '/routes/:routeId',
  wrapAsync(async (req, res, next) => {
    const uid = req.authUser!.userId;
    const { routes, routeStops } = getRepositories();
    const row = await routes.findByIdAndUser(req.params.routeId, uid);
    if (!row) {
      next(new HttpError(404, 'Ruta no encontrada'));
      return;
    }
    const stops = await routeStops.findByRouteId(row.id);
    res.json({ ...row, stops });
  })
);

routesCrudRouter.patch(
  '/routes/:routeId',
  wrapAsync(async (req, res, next) => {
    const parsed = routePatchSchema.safeParse(req.body);
    if (!parsed.success) {
      next(new HttpError(400, 'Cuerpo inválido', parsed.error.flatten()));
      return;
    }
    const uid = req.authUser!.userId;
    const { routes } = getRepositories();
    const row = await routes.update(req.params.routeId, uid, parsed.data);
    if (!row) {
      next(new HttpError(404, 'Ruta no encontrada'));
      return;
    }
    res.json(row);
  })
);

routesCrudRouter.delete(
  '/routes/:routeId',
  wrapAsync(async (req, res, next) => {
    const uid = req.authUser!.userId;
    const { routes } = getRepositories();
    const ok = await routes.delete(req.params.routeId, uid);
    if (!ok) {
      next(new HttpError(404, 'Ruta no encontrada'));
      return;
    }
    res.status(204).send();
  })
);

routesCrudRouter.get(
  '/routes/:routeId/stops',
  wrapAsync(async (req, res, next) => {
    const uid = req.authUser!.userId;
    const { routes, routeStops } = getRepositories();
    const row = await routes.findByIdAndUser(req.params.routeId, uid);
    if (!row) {
      next(new HttpError(404, 'Ruta no encontrada'));
      return;
    }
    const stops = await routeStops.findByRouteId(row.id);
    res.json(stops);
  })
);

routesCrudRouter.post(
  '/routes/:routeId/stops',
  wrapAsync(async (req, res, next) => {
    const parsed = stopCreateSchema.safeParse(req.body);
    if (!parsed.success) {
      next(new HttpError(400, 'Cuerpo inválido', parsed.error.flatten()));
      return;
    }
    const uid = req.authUser!.userId;
    const { routes, routeStops } = getRepositories();
    const row = await routes.findByIdAndUser(req.params.routeId, uid);
    if (!row) {
      next(new HttpError(404, 'Ruta no encontrada'));
      return;
    }
    const stop = await routeStops.create(row.id, {
      establishment_id: parsed.data.establishment_id,
      service_id: parsed.data.service_id ?? null,
      sort_order: parsed.data.sort_order,
      estimated_travel_minutes_from_prev: parsed.data.estimated_travel_minutes_from_prev,
      estimated_stay_minutes: parsed.data.estimated_stay_minutes ?? null,
      latitude: parsed.data.latitude,
      longitude: parsed.data.longitude,
      note: parsed.data.note ?? null,
    });
    res.status(201).json(stop);
  })
);

routesCrudRouter.patch(
  '/routes/:routeId/stops/:stopId',
  wrapAsync(async (req, res, next) => {
    const parsed = stopPatchSchema.safeParse(req.body);
    if (!parsed.success) {
      next(new HttpError(400, 'Cuerpo inválido', parsed.error.flatten()));
      return;
    }
    const uid = req.authUser!.userId;
    const { routes, routeStops } = getRepositories();
    const row = await routes.findByIdAndUser(req.params.routeId, uid);
    if (!row) {
      next(new HttpError(404, 'Ruta no encontrada'));
      return;
    }
    const updated = await routeStops.update(row.id, req.params.stopId, parsed.data);
    if (!updated) {
      next(new HttpError(404, 'Parada no encontrada'));
      return;
    }
    res.json(updated);
  })
);

routesCrudRouter.delete(
  '/routes/:routeId/stops/:stopId',
  wrapAsync(async (req, res, next) => {
    const uid = req.authUser!.userId;
    const { routes, routeStops } = getRepositories();
    const row = await routes.findByIdAndUser(req.params.routeId, uid);
    if (!row) {
      next(new HttpError(404, 'Ruta no encontrada'));
      return;
    }
    const ok = await routeStops.delete(row.id, req.params.stopId);
    if (!ok) {
      next(new HttpError(404, 'Parada no encontrada'));
      return;
    }
    res.status(204).send();
  })
);
