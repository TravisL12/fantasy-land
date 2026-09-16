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
- **Analysis** (`sports/analysis/`): pure, sport-agnostic engines that `SportsService` composes, in the same spirit as `scoring/`. `matchup.ts` turns team strength into a 0-100 league-relative percentile score plus a grade (metric definitions come from the provider, so the engine stays generic); `form.ts` compares a player's last N games with their season and labels it hot/cold/steady; `starts.ts` projects a pitcher's next starts from their measured rest pattern; `window.ts` slices a game log to an interval (dates, weeks, then `lastN`) and `head-to-head.ts` turns those slices into player-vs-player records and two teams' meetings into a series record. A window is a filter over the season game log, not a second fetch, so any interval is free. Head-to-head matches games **by week where the sport has one**, by date otherwise — matching NFL players on date drops a Thursday-vs-Sunday week.
- **Optional provider capability** (`LeagueDataProvider` in `sports.types.ts`): schedules, team strength and roster availability. Only MLB implements it today. A sport that doesn't simply omits the methods, and `providesLeagueData()` makes `SportsService` say so rather than failing obscurely. Adding it to NFL later needs no changes above the provider.
  - Rosters come from the **40-man**, not `fullRoster` — the latter returns 300+ minor leaguers, and the 40-man still carries 60-day IL players. Statuses are normalized to `AVAILABILITY` (active/injured/minors/inactive) so tools never parse league wording.
  - Games carry a `score` only once they are **final**; a live game's running score is left null so it cannot be counted as a result. `getHeadToHead` asks upstream for just the two teams' meetings rather than filtering a whole season's schedule.
  - MLB publishes probable pitchers only **~4 days out**. Anything past that is projected from rest pattern and every start carries `confidence: 'confirmed' | 'projected'`. The league-wide sweep can only see announced starts, so `getStarts` returns a `coverageNote` saying what it missed; passing `playerIds` measures each pitcher's real rest from their game log.
- **Caching**: `DataCacheService.wrap(key, ttl, loader)` goes memory → Postgres `data_cache` → loader. Concurrent loads are deduped, and it serves stale data if the upstream API fails. Cache the *normalized* result, not raw payloads. Bump `SPORTS_CACHE_VERSION` whenever a mapper/stat definition changes. TTLs: current season 15 min, past seasons 7 days.
- **Frontend**: `api/sports/` mirrors the DTOs. Explorer filters live in the URL (`useSearchParamsState`) so views are shareable. The stat columns a user picks live in the `statColumns` slice, persisted to localStorage (`store/persistence.ts`), and are shared by leaderboards and game logs. Format values with `formatStat(value, stat.format)`.

## Chat (local LLM + MCP)

`/api/chat` is a streaming conversation with a local model that answers using live tool data:

```
browser (SSE) ← chat.controller ← ChatService loop → OllamaClient → Ollama (host)
                                          ↓
                                    ToolRegistry
                                    ├─ local tools (in-process) → SportsService → providers
                                    └─ McpService → MCP servers (stdio) → Sleeper API
```

- **Model**: Ollama on the host, reached at `OLLAMA_BASE_URL` (`host.docker.internal` from the container — compose sets `extra_hosts`). `OLLAMA_MODEL` picks the model and it **must support tool calling**. `OLLAMA_THINK=true` streams a reasoning block as separate `thinking` events. `OLLAMA_NUM_CTX` (default 16384) is sent as `num_ctx`: past it Ollama silently drops the oldest messages, so the system prompt and tool schemas have to be paid for explicitly.
- **Loop**: `ChatService.run()` is an async generator yielding `ChatStreamEvent`s. Each round streams one assistant turn; if it produced tool calls they are executed, appended as `role: 'tool'` messages, and the loop runs again — up to `CHAT_MAX_TOOL_ROUNDS`, which stops runaway local models. The controller serializes each event as one SSE `data:` line, and aborts the loop when the client disconnects.
- **Tools** (`modules/tools/`): `ToolRegistry` is the single tool list the model sees. Our own tools are `@Injectable()` classes implementing `FantasyTool` (`definition` + `execute`), listed in `tools.module.ts` and collected through the `FANTASY_TOOLS` token — same multi-provider pattern as `SPORT_PROVIDERS`. They run **in-process**, so they get the real `SportsService`, the Postgres data cache and the scoring engine with no subprocess or second DB pool. Local tools win a name clash with an MCP server's tool (ours shadows Sleeper's weaker `compare_players`). Thrown `HttpException`s become `isError` results carrying the validation message, so the model can correct itself instead of the turn dying. **To add a tool: implement `FantasyTool` under `tools/<area>/` and list it in `tools.module.ts`** — nothing else changes. Tool definitions are already MCP-shaped, so serving them to external MCP clients later is an add-on, not a rewrite.
- **Sports tools** (`tools/sports/`): `find_player`, `get_sport_catalog`, `get_leaderboard`, `get_player_season_stats`, `get_player_game_log`, `get_player_form`, `compare_players` (season or any interval via `startDate`/`endDate`/`weeks`/`lastN`, plus a head-to-head over the games the players shared). These are sport-agnostic and take a `sport` argument. Args are coerced through `tools.utils.ts` because small models send numbers as strings and bare strings for arrays. Every list is capped (`LEADERBOARD_LIMIT`, `GAME_LOG_LIMIT`) — an uncapped result will bury the question in the context window. `find_player` searches **every** stat group, not just the first: MLB's first group is hitting, so searching one group would make pitchers invisible.
- **Baseball tools** (`tools/baseball/`): `get_probable_pitchers`, `get_pitcher_starts` (the two-start tool), `get_matchup_ratings`, `compare_teams` (team head-to-head: the games two teams played each other with scores and the series record, plus both teams' production over the same window — passing both dates measures team stats over the interval via `byDateRange` instead of season-to-date), `get_player_status`. They default to `mlb` rather than `nfl` and go through the `LeagueDataProvider` capability, so they return a clear "not wired up for this sport" message elsewhere. Date windows are validated and capped by `resolveDateRange` (`sports.utils.ts`).
- **Sleeper tools** (`tools/sleeper/`): `get_user_info` and `get_user_leagues` shadow the bundled MCP server's versions of the same names, which were unusable — Sleeper answers an unknown user with `200 null` (the MCP one then threw an opaque TypeError) and its `get_user_leagues` defaults the season to a hardcoded past year, so current leagues came back empty and the model blamed the username. Ours default to the live NFL season with a one-season fallback, accept a username wherever an id is asked for, and say which of "no such account" / "no leagues" happened.
- **MCP** (`modules/mcp/`): `McpService` connects to the servers in `MCP_SERVERS` (JSON; defaults to the bundled `sleeper-mcp` package) over stdio, **lazily on first use**, and flattens their tools into one model-facing list. A server that fails to start is logged and skipped rather than breaking boot or chat. Colliding tool names get namespaced as `<server>_<tool>`. Tool output is truncated to `MAX_TOOL_RESULT_CHARS` — local context windows are small. To add a server, append to `MCP_SERVERS`; no code change.
- **Truncation** (`common/text/truncate.ts`): tool results are capped at `MAX_TOOL_RESULT_CHARS`, **structurally** — `serializeToolResult` binary-searches the largest per-list cap that fits, so the model gets valid JSON with fewer rows plus a `_truncated` note saying `<path>: showing N of M`, not a string cut mid-token. MCP text goes through `serializeToolText`, which parses JSON and falls back to character truncation for prose. The system prompt tells the model `_truncated` means "partial but real", because otherwise it reports the truncation as a failure instead of answering.
- **Prompting**: `SYSTEM_PROMPT` in `chat.constants.ts` spells out all three tool families and Sleeper's id lookup chain (username → user_id → league_id), because small models otherwise invent league ids. It also tells the model to pass `sport` explicitly every time and to pass on the confirmed/projected distinction for pitcher starts. `SEASON_CONTEXT` is appended per request with the season (and week, where the sport has one) resolved from **every** catalog: telling the model the year is the only reliable fix for "last season" — instructing it to look the year up does not work at this size. Tune prompts there, not inline.
- **No baseball league connection.** Sleeper covers NFL only, and there is no Yahoo integration, so for baseball the model is told to ask which players are on the user's roster rather than trying to look it up.
- **Publishing our tools** (`modules/mcp-server/`): `POST /api/mcp` serves `ToolRegistry.listLocalTools()` over MCP's Streamable HTTP transport, so Claude Code, Claude Desktop and other agents share this backend's cache and scoring. Note the direction of the two modules: `mcp/` is the **client** we consume third-party servers with, `mcp-server/` is the **server** we expose. It publishes local tools only, via `callLocalTool` — we don't proxy someone else's MCP server. **Stateless** (`sessionIdGenerator: undefined`): a fresh `Server` and transport per request, torn down on response close, so there is no session store and `GET`/`DELETE` are 405. Auth is a bearer token (`MCP_HTTP_TOKEN`) checked in constant time by `McpTokenGuard`, not the session cookie — the callers are agents, not browsers — and the endpoint returns 503 until a token is set. A tool that throws still returns `isError` content rather than a JSON-RPC error, so clients see the reason.
- **Frontend**: `api/streamSse.ts` is a plain `fetch` generator — RTK Query can't model a stream, so only `/chat/status` goes through `baseApi`. `ChatPage.hooks.ts` folds events into turns; tool calls render as expandable rows so you can see what the model actually fetched.

## Dashboards (generated UI)

`/dashboards` is a chat that builds interactive views instead of answering in prose:

```
browser → /api/dashboards/build (SSE) → ChatService.run(options) → model
                                              ↓ build_dashboard tool
                                        DashboardSpec  ──saved as jsonb──→ dashboards table
                                              ↓
browser ← /api/dashboards/run ← DashboardsService → ToolRegistry.callLocalToolData → SportsService
```

- **A dashboard is a spec, never a snapshot.** `DashboardSpec` = `sources` (tool calls) + `widgets`. Opening or refreshing one re-runs its sources, so a saved dashboard is a live view. Nothing but the spec is stored.
- **Prompt budget.** Every widget kind costs tokens in `BUILDER_SYSTEM_PROMPT` *and* the `build_dashboard` schema, on every round, against `OLLAMA_NUM_CTX`. Keep the per-kind wording to a line and the example to one dashboard — what the model most needs that context for is reading a real tool result before it designs.
- **Building** (`dashboard-builder.service.ts`) reuses the chat loop: `ChatService.run(history, signal, { systemPrompt, extraTools })`. The builder passes `BUILDER_SYSTEM_PROMPT` and one request-scoped tool, `BuildDashboardTool`, which fetches nothing — it validates the model's design and captures it, and the spec goes out as a `dashboard_spec` SSE event alongside the normal chat events. The prompt makes the model **call the data tool first and read the real field names**; designing blind produces columns that render empty.
- **Validation** (`dashboards.utils.ts` `parseSpec`) is deliberately chatty: every failure names the exact widget, column or id that is wrong, because a `BadRequestException` comes back to the model as a tool error and it fixes it on the next round. It also absorbs small-model quirks (a nested object sent as a JSON string, a missing column `path`).
- **Running**: `callLocalToolData` is `callLocalTool` without truncation — a dashboard renders the result rather than feeding it to a context window. Sources run in parallel and failures are per source, so one dead upstream leaves the rest usable.
- **Widgets** are a closed set, rendered by `components/DashboardView/`. Columns address data by **dot path** (`stats.homeRuns`) and are formatted with `formatCell`, so the renderer never knows anything sport-specific:
  - `table` — sortable `DataTable` with optional row ticking. `compare` — the transpose of a table, showing the *ticked* rows side by side. `versus` — the same grid sourced directly from `compare_players`/`compare_teams`, no ticking, with the better value on each metric marked (a metric says `better: 'lower'` where a smaller number wins, e.g. volatility).
  - `line` / `bar` — one data model, two marks: an `x` axis path plus up to `SPEC_LIMITS.series` series. **A series may name its own `source`**, which is how two players' game logs land on one pair of axes.
  - `stats` — a row of KPI tiles read out of one object (`path: 'consistency'`). `meter` — a 0-100 rating and its grade per row, built for `get_matchup_ratings`. `badges` — status chips per row (availability, hot/cold), matched to a tone in `STATUS_TONES`; unknown wording stays neutral rather than being guessed into a severity.
  - Every widget takes `width: 'full' | 'half'`, laid out in a two-column grid.
  - Each kind has one entry in `WIDGET_PARSERS` (`dashboards.utils.ts`) rather than another branch. **To add a widget kind: add it to `WIDGET_TYPES`, add a parser to `WIDGET_PARSERS`, describe it in `BUILDER_SYSTEM_PROMPT` and the `build_dashboard` schema, and render it in `DashboardView`.**
- **Charts** are drawn with **Observable Plot** in `components/Chart/`, lazy-loaded — Plot pulls in d3 and costs ~90kB gzipped, too much for every page load. Plot is imperative, so the component renders into a ref and measures its own width. The house rules live in `Chart.constants.ts` and `theme.colors.series`: series colors are assigned **by spec position, never by rank**, so a filter can't repaint the survivors; the palette's dark steps are validated against our surface, and only the first three clear the colorblind gates for *every* pair, which is why charts cap at four series and always ship a legend plus direct end-labels. Bars cap at 24px (the band's leftover is air) with a rounded data end, lines get a crosshair whose single tooltip lists every series at that x, and **Show data** prints the same numbers as a table so nothing is gated behind hover. `toNumber` refuses `null`/`''` on purpose: `Number(null)` is 0, and a missed game must not plot as a zero-point game.
- Sorting, ticking and comparing all happen in the browser. The API is hit only on open and on Refresh.
- `get_leaderboard` rejects a `sort` key its group does not define. It used to fall back to alphabetical order, which reads as a real ranking and quietly made every generated "top N" dashboard wrong.
- The chat pieces are shared, not duplicated: `useChatStream` (any SSE endpoint, plus an `onEvent` hook for extra event types), `ChatComposer` and `MessageBubble` live in `components/`, and `streamSse` is the one SSE reader.

## Hygiene

Run `/hygiene` periodically (or after a big feature) — it spins up the `fe-expert` and `be-expert` agents to refactor, DRY up, and enforce the conventions above.
