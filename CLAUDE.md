# Fantasy Land

Dockerized web app. `frontend/` = Vite + React + TypeScript + styled-components + Redux Toolkit (RTK Query). `backend/` = NestJS (TypeScript, ESM). Package manager: **yarn** (never npm/pnpm). Postgres via Drizzle ORM (`db` service in docker compose).

## Running

- `yarn dev` — `docker compose up --build` (frontend http://localhost:5173, backend http://localhost:3000/api)
- `yarn verify` — lint + typecheck + test + build for both apps. Run before calling work done.
- Per app: `yarn fe <script>` / `yarn be <script>` (e.g. `yarn fe add dayjs`, `yarn be test:e2e`)
- After adding a dependency, rebuild and reset the node_modules volume: `docker compose rm -sf backend && docker volume rm fantasy-land_backend_node_modules && docker compose up --build -d` (same for `frontend`). Named volumes are not refreshed by `-V`.

## Frontend conventions (`frontend/src`)

```
api/<endpoint>/        RTK Query: <endpoint>.api.ts (baseApi.injectEndpoints), <endpoint>.types.ts, index.ts
components/<Name>/     shared components
pages/<Name>Page/      one folder per route
store/                 store + typed hooks; slices/<name>/ (<name>.slice.ts, .types.ts, .constants.ts, .selectors.ts, index.ts)
router/                createBrowserRouter + routes.constants.ts (ROUTES)
styles/                theme, GlobalStyle, styled.d.ts (DefaultTheme typing)
test/                  setup + renderWithProviders
hooks/ utils/ types/ constants/   app-wide shared code (create when first needed)
```

Every component/page folder has this shape — create only the files that have content, but never inline them into the `.tsx`:

```
Name/
  index.ts             public exports only
  Name.tsx             JSX + wiring, no styled() calls, no magic strings/numbers
  Name.styles.ts       all styled-components
  Name.types.ts        props & local types
  Name.constants.ts    copy, config, enum-like `as const` objects
  Name.hooks.ts        hooks private to this component/page (app-wide hooks go in src/hooks/)
  Name.test.tsx        tests (vitest + Testing Library)
  components/<Sub>/    sub components, same shape, private to the parent
```

Rules:
- Import via `@/` alias across folders; relative imports only within a component folder. Import other components through their `index.ts`.
- A sub component used by 2+ parents gets promoted to `components/`.
- Styled-components: transient props (`$variant`), theme values only (no raw hex/px in styles except one-offs), types in `.types.ts`.
- `erasableSyntaxOnly` is on: no TS `enum`s — use `as const` objects in `.constants.ts`.
- Server state lives in RTK Query (`api/`), not slices. Slices are for client/UI state. Use `useAppSelector`/`useAppDispatch`.
- Arrow-function named exports (`export const Name = () => …`), no default exports.

## Backend conventions (`backend/src`)

```
main.ts / app.setup.ts   bootstrap; app.setup.ts holds prefix/pipes/filters shared with e2e tests
app.module.ts
config/                  registerAs() configs + config.constants.ts
common/                  cross-cutting filters, guards, interceptors, decorators, pipes
modules/<endpoint>/      one folder per endpoint/resource:
  <endpoint>.module.ts
  <endpoint>.controller.ts
  <endpoint>.service.ts
  <endpoint>.types.ts
  <endpoint>.constants.ts
  <endpoint>.controller.spec.ts / <endpoint>.service.spec.ts
  dto/                   class-validator DTOs (create-<x>.dto.ts, update-<x>.dto.ts, <x>-response.dto.ts)
```

Rules:
- All routes are under `/api` (global prefix). Controller path comes from `<endpoint>.constants.ts`.
- ESM: relative imports end in `.js`. Types-only imports use `import type` (but DI-injected classes must be value imports).
- Controllers are thin; logic lives in services. Validate input with DTOs + the global ValidationPipe.
- Generate modules with `yarn be nest g resource modules/<name> --no-spec` then reshape to the layout above.
- The frontend `api/<endpoint>/` folder mirrors `modules/<endpoint>/`; keep response types in sync.

## Database (Drizzle + Postgres)

- Connection lives in `backend/src/database/` (global `DatabaseModule`). Inject the client with `@Inject(DRIZZLE) db: Database`.
- Tables live beside their feature as `modules/<endpoint>/<name>.schema.ts` and must be re-exported from `database/schema.ts`. Columns use camelCase in TS; `casing: 'snake_case'` maps them to snake_case in SQL.
- Row types go in `<endpoint>.types.ts` via `typeof table.$inferSelect` / `$inferInsert`.
- Migration flow: edit a schema → `yarn be db:generate --name <change>` → commit the SQL in `backend/drizzle/`. Pending migrations run automatically on app boot, under an advisory lock. `yarn be db:studio` opens a browser for the data.
- Unique violations: `getUniqueViolation(error)` from `database/database.utils.ts` returns the constraint name so you can map it to a 409.
- e2e tests (`yarn be test:e2e`) need Postgres running: `docker compose up -d db`.

## Auth

- Cookie sessions: an httpOnly `session` cookie holds a random token, and only its SHA-256 is stored in `sessions`. Sessions last 30 days (`SESSION_TTL_DAYS`) and slide forward once past half their lifetime. Passwords are hashed with argon2id (`@node-rs/argon2`).
- `SessionGuard` is global: **every route requires login unless decorated `@Public()`**. Get the user with `@CurrentUser()`.
- Endpoints: `POST /api/auth/register`, `POST /api/auth/login` (both rate-limited), `POST /api/auth/logout`, `GET /api/auth/me` → `{ user | null }`.
- Frontend: `useCurrentUser()` (`@/hooks`) reads the `getMe` cache. The login, register and logout mutations write the result straight into that cache. Wrap private routes in `<RequireAuth />` and login/register in `<RequireGuest />` (layout routes in `router/index.tsx`).

## Sports data (fantasy picks foundation)

The product's focus is finding the best fantasy picks. Everything sport-specific goes through one pipeline:

```
upstream API → providers/<sport>/ (fetch + map to normalized shapes, cached) → SportsService (score, filter, sort) → /api/sports/*
```

- **Providers** (`backend/src/modules/sports/providers/<sport>/`) implement `SportProvider` from `sports.types.ts`: `getCatalog`, `getStatLines` and `getGameLog`. Each has `<sport>.constants.ts` (stat groups, stat definitions, scoring presets), `<sport>.types.ts` (raw upstream shapes), `<sport>.mapper.ts` (pure mapping, unit-tested) and `<sport>.provider.ts` (HTTP + caching). To add a sport, create a provider and register it in `sports.module.ts`.
  - **MLB**: `statsapi.mlb.com/api/v1` (no key). Pitchers are labeled SP/RP by share of starts. `singles` is derived from hits so points scoring works. Innings are stored as true thirds (`184.2` → 184.667).
  - **NFL**: Sleeper. Documented `api.sleeper.app/v1` (state/players) plus the undocumented `api.sleeper.com` stats/projections endpoints. Season stats are **summed from weekly data**, because Sleeper's season totals lag behind in-season; rate stats are rebuilt from `NFL_DERIVED_RATES`. Sleeper asks for fewer than 1000 calls/min and non-commercial use.
- **Scoring**: `scoring/scoring.ts` is sport-agnostic, computing `sum(stat × weight)` with presets per stat group. We never trust upstream fantasy points. NFL presets reproduce Sleeper's own `pts_std/half_ppr/ppr` (≈99% of players match exactly; the rest are rare-play edge cases). `providers/catalog.spec.ts` fails if a rule or default references a stat the group doesn't define; undefined stats are dropped during mapping and would silently score 0.
- **Summary stats** (`summarizePoints`): average, median, stdDev (volatility), floor and ceiling per game. This is the starting point for pick analysis (consistency, trends, matchups).
- **Caching**: `DataCacheService.wrap(key, ttl, loader)` goes memory → Postgres `data_cache` → loader. Concurrent loads are deduped, and it serves stale data if the upstream API fails. Cache the *normalized* result, not raw payloads. Bump `SPORTS_CACHE_VERSION` whenever a mapper/stat definition changes. TTLs: current season 15 min, past seasons 7 days.
- **Frontend**: `api/sports/` mirrors the DTOs. Explorer filters live in the URL (`useSearchParamsState`) so views are shareable. The stat columns a user picks live in the `statColumns` slice, persisted to localStorage (`store/persistence.ts`), and are shared by leaderboards and game logs. Format values with `formatStat(value, stat.format)`.

## Hygiene

Run `/hygiene` periodically (or after a big feature) — it spins up the `fe-expert` and `be-expert` agents to refactor, DRY up, and enforce the conventions above.
