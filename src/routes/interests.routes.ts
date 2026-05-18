import { Router } from 'express';
import { getRepositories } from '../container.js';
import { wrapAsync } from '../utils/wrapAsync.js';

export const interestsRouter = Router();

interestsRouter.get(
  '/interests',
  wrapAsync(async (_req, res) => {
    const { interests } = getRepositories();
    const rows = await interests.findAll();
    res.json(rows);
  })
);
