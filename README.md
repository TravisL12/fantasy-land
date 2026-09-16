# Fantasy Land

A fantasy sports stats explorer. Sign in, pick a sport, and browse season or weekly player stats with fantasy points calculated under common scoring presets. Click a player to see their game log and a points summary (average, median, std dev, floor, ceiling).

| Sport | League | Data source | Stat groups | Scoring presets |
| --- | --- | --- | --- | --- |
| Football | NFL | [Sleeper](https://sleeper.com) (stats + projections) | Offense, Kicking, Defense | PPR, Half PPR, Standard |
| Baseball | MLB | MLB Stats API | Hitting, Pitching | Standard points (ESPN-style H2H) |

## Stack

- **Frontend** (`frontend/`): Vite, React 19, TypeScript, styled-components, Redux Toolkit / RTK Query, React Router
- **Backend** (`backend/`): NestJS 12 (TypeScript, ESM), Drizzle ORM, class-validator, argon2
- **Database:** Postgres 17
- **Tooling:** yarn (v1), Docker Compose, Vitest, oxlint, Prettier. Node version is in `.node-version`.

## Getting started

```bash
cp .env.example .env
yarn dev          # docker compose up --build (db, backend, frontend)
```

- App: http://localhost:5173
- API: http://localhost:3000/api (health check at `/api/health`)
- Postgres: `localhost:5432` (user/password `app`, db `fantasy_land`)

Migrations run automatically when the backend starts. Ports can be changed in `.env` (`FRONTEND_PORT`, `BACKEND_PORT`, `DB_PORT`).

After adding a dependency, rebuild so the `node_modules` volumes refresh:

```bash
docker compose up --build -V
```

### Running without Docker

You still need Postgres. Start just the database, then run each app in its own terminal:

```bash
docker compose up db
yarn install:all
yarn be start:dev
yarn fe dev
```

The Vite dev server proxies `/api` to `http://localhost:3000`.

## Scripts

Run these from the repo root:

| Command | What it does |
| --- | --- |
| `yarn dev` / `yarn down` | Start / stop the Docker stack |
| `yarn verify` | Lint, typecheck, test, and build both apps. Run before calling work done. |
| `yarn fe <script>` | Run a frontend script, e.g. `yarn fe test:watch`, `yarn fe add dayjs` |
| `yarn be <script>` | Run a backend script, e.g. `yarn be test:e2e`, `yarn be db:generate` |

Backend database scripts:

- `yarn be db:generate`: generate a migration from changes to `*.schema.ts` files (written to `backend/drizzle/`)
- `yarn be db:migrate`: apply migrations manually
- `yarn be db:studio`: open Drizzle Studio

E2E tests (`yarn be test:e2e`) need Postgres running. Set `DATABASE_URL` if it isn't at `localhost:5432`.

## How it works

### Auth

Users register with an email, username, and password. Passwords are hashed with argon2. Sessions are stored in Postgres and sent as an HTTP-only `session` cookie that lasts 30 days (`SESSION_TTL_DAYS`) and renews automatically. A global `SessionGuard` protects every route unless it is marked `@Public()`. Register and login are rate-limited.

### API

All routes are under `/api`.

| Method | Route | Description |
| --- | --- | --- |
| `GET` | `/health` | Health check |
| `POST` | `/auth/register`, `/auth/login`, `/auth/logout` | Session management |
| `GET` | `/auth/me` | Current user, or `null` |
| `GET` | `/sports` | Catalog of every sport |
| `GET` | `/sports/:sport` | One sport's catalog: stat groups, positions, scoring presets |
| `GET` | `/sports/:sport/stats` | Paginated player stats. Filters: season, week, group, position, kind, scoring, sort, order, minGames, search |
| `GET` | `/sports/:sport/players/:playerId/stats` | A player's game log and points summary |

### Sports providers and caching

Each sport is a provider in `backend/src/modules/sports/providers/<sport>/`. A provider fetches from the upstream API, maps the response to a common stat shape, and declares its stat groups and scoring presets. Fantasy points are calculated in `sports/scoring/`.

Upstream responses go through `DataCacheService`, a read-through cache that checks memory, then Postgres, then the upstream API. TTLs range from 15 minutes for live data to 7 days for archived seasons. Concurrent requests for the same key share a single fetch. If an upstream API fails, the service returns the last cached value. After changing a mapper, bump `SPORTS_CACHE_VERSION` to invalidate cached payloads.

### Frontend

| Route | Page |
| --- | --- |
| `/` | Home: welcome message and API health |
| `/login`, `/register` | Auth forms (guests only) |
| `/sports` | Sport picker |
| `/sports/:sport` | Stats table with filters, search, sorting, pagination, and a column picker |
| `/sports/:sport/players/:playerId` | Player game log and points summary |

Stats filters are stored in the URL, so views can be shared. Column choices are saved to `localStorage`.

## Project layout

```
frontend/src/
  api/<endpoint>/       RTK Query endpoints (mirror backend modules)
  components/           shared components
  pages/<Name>Page/     one folder per route
  store/                store, typed hooks, UI slices, localStorage persistence
  router/  styles/  hooks/  utils/  test/
backend/src/
  config/               registerAs() configs
  common/               filters, decorators, HTTP helpers
  database/             Drizzle client, schema barrel, migration runner
  modules/              auth, users, sports, data-cache, health
backend/drizzle/        SQL migrations
```

Coding conventions (folder-per-component layout, file naming, import rules) are documented in [CLAUDE.md](CLAUDE.md).
