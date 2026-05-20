import cors from 'cors';
import express, { type ErrorRequestHandler } from 'express';
import { getEnv } from './config/env.js';
import { authRouter } from './routes/auth.routes.js';
import { establishmentsRouter } from './routes/establishments.routes.js';
import { healthRouter } from './routes/health.routes.js';
import { interestsRouter } from './routes/interests.routes.js';
import { reservationsRouter } from './routes/reservations.routes.js';
import { routesCrudRouter } from './routes/routesCrud.routes.js';
import { syncRouter } from './routes/sync.routes.js';
import { HttpError } from './utils/httpError.js';
import { reservationsRouter } from './routes/reservations.routes.js';

export function createApp() {
  const app = express();
  const { CORS_ORIGIN } = getEnv();

  app.use(
    cors({
      origin: CORS_ORIGIN === '*' ? true : CORS_ORIGIN.split(',').map((s) => s.trim()),
      credentials: true,
    })
  );
  app.use(express.json({ limit: '1mb' }));

  const api = express.Router();
  api.use(healthRouter);
  api.use(authRouter);
  api.use(interestsRouter);
  api.use(establishmentsRouter);
  api.use(syncRouter);
  api.use(reservationsRouter);
  api.use(routesCrudRouter);
  api.use(reservationsRouter);

  app.use('/api/v1', api);

  const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
    if (err instanceof HttpError) {
      res.status(err.status).json({ error: err.message, details: err.details });
      return;
    }
    console.error(err);
    res.status(500).json({ error: 'Error interno del servidor' });
  };
  app.use(errorHandler);

  return app;
}
