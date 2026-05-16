import { Router } from 'express';
import { getEnv } from '../config/env.js';
import { getRepositories } from '../container.js';
import { HttpError } from '../utils/httpError.js';
import { wrapAsync } from '../utils/wrapAsync.js';

export const syncRouter = Router();

syncRouter.post(
  '/sync/seed',
  wrapAsync(async (req, res, next) => {
    const secret = req.header('x-seed-secret');
    if (!secret || secret !== getEnv().SEED_SYNC_SECRET) {
      next(new HttpError(403, 'Secreto de sincronización inválido'));
      return;
    }
    const { seed } = getRepositories();
    await seed.runPopulateFromCsv();
    res.json({ ok: true, message: 'Staging cargado y sp_populate_from_seed_staging ejecutado' });
  })
);
