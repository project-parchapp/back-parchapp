import { Router } from 'express';
import { checkDb } from '../db/pool.js';
import { wrapAsync } from '../utils/wrapAsync.js';

export const healthRouter = Router();

healthRouter.get(
  '/health',
  wrapAsync(async (_req, res) => {
    let dbOk = false;
    try {
      dbOk = await checkDb();
    } catch {
      dbOk = false;
    }
    res.json({ status: 'ok', database: dbOk ? 'up' : 'down' });
  })
);
