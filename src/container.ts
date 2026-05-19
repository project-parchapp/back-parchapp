import { getPool } from './db/pool.js';
import { EstablishmentRepository } from './repositories/EstablishmentRepository.js';
import { InterestRepository } from './repositories/InterestRepository.js';
import { ReservationRepository } from './repositories/ReservationRepository.js';
import { RouteRepository } from './repositories/RouteRepository.js';
import { RouteStopRepository } from './repositories/RouteStopRepository.js';
import { SeedRepository } from './repositories/SeedRepository.js';
import { UserRepository } from './repositories/UserRepository.js';
import { getEnv } from './config/env.js';

export type Repositories = {
  users: UserRepository;
  interests: InterestRepository;
  establishments: EstablishmentRepository;
  routes: RouteRepository;
  routeStops: RouteStopRepository;
  seed: SeedRepository;
  reservations: ReservationRepository;
};

let repos: Repositories | null = null;

export function getRepositories(): Repositories {
  if (!repos) {
    const pool = getPool();
    const { SEED_CSV_DIR } = getEnv();
    repos = {
      users: new UserRepository(pool),
      interests: new InterestRepository(pool),
      establishments: new EstablishmentRepository(pool),
      routes: new RouteRepository(pool),
      routeStops: new RouteStopRepository(pool),
      seed: new SeedRepository(pool, SEED_CSV_DIR),
      reservations: new ReservationRepository(pool),
    };
  }
  return repos;
}
