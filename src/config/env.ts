import { config } from 'dotenv';
import { z } from 'zod';

config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(3000),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL es obligatoria'),
  JWT_SECRET: z.string().min(16, 'JWT_SECRET debe tener al menos 16 caracteres'),
  CORS_ORIGIN: z.string().default('*'),
  SEED_SYNC_SECRET: z.string().min(1, 'SEED_SYNC_SECRET es obligatoria'),
  SEED_CSV_DIR: z.string().min(1, 'SEED_CSV_DIR es obligatoria'),
});

export type Env = z.infer<typeof envSchema>;

let cached: Env | null = null;

export function getEnv(): Env {
  if (cached) return cached;
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const msg = parsed.error.flatten().fieldErrors;
    throw new Error(`Variables de entorno inválidas: ${JSON.stringify(msg)}`);
  }
  cached = parsed.data;
  return cached;
}
