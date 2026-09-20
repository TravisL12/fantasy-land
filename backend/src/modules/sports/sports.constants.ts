export const SPORTS_ROUTE = 'sports';
export const SPORTS_ROUTES = {
  catalog: ':sport',
  stats: ':sport/stats',
  expectedPoints: ':sport/expected-points',
  players: ':sport/players',
  playerStats: ':sport/players/:playerId/stats',
  playerSeasons: ':sport/players/:playerId/seasons',
  schedule: ':sport/schedule',
  preview: ':sport/preview',
  standings: ':sport/standings',
  starts: ':sport/starts',
  matchups: ':sport/matchups',
  availability: ':sport/availability',
} as const;

export const SPORT_KEYS = { mlb: 'mlb', nfl: 'nfl' } as const;
export const DATA_KINDS = {
  stats: 'stats',
  projections: 'projections',
} as const;
export const STAT_FORMATS = {
  int: 'int',
  decimal: 'decimal',
  rate: 'rate',
  percent: 'percent',
  /** Baseball innings stored as true thirds, displayed as 184.2. */
  innings: 'innings',
} as const;
export const SORT_ORDERS = { asc: 'asc', desc: 'desc' } as const;

/** Normalized roster availability, so tools don't parse league-specific wording. */
export const AVAILABILITY = {
  active: 'active',
  injured: 'injured',
  minors: 'minors',
  inactive: 'inactive',
} as const;

/**
 * Where a team sits in the playoff picture, in one vocabulary whatever wording
 * its league uses — MLB publishes a boolean and a letter, ESPN publishes a
 * different letter, and a tool should never have to parse either.
 */
export const CLINCH_STATUS = {
  clinched: 'clinched',
  eliminated: 'eliminated',
  contending: 'contending',
} as const;

/**
 * A magic number counts down on a win or a rival's loss, so it is a real
 * countdown to winning the group and nothing more. It says nothing about the
 * tiebreakers that decide a level finish, which is why it ships with a note.
 */
export const STANDINGS_METHOD = {
  upstream:
    'Clinch and elimination numbers are the league\'s own published figures.',
  computed:
    'Clinch and elimination numbers are computed as (games in season + 1) − own wins − rival losses, counting a tie as half a win. They track winning the division and nothing else: they do not account for the head-to-head, division, conference and strength-of-victory tiebreakers that actually settle a level finish, so a magic number of 1 is not the same as having clinched.',
} as const;

/** Which side of the ball a matchup is rated for. */
export const MATCHUP_SIDES = { hitting: 'hitting', pitching: 'pitching' } as const;

export const MATCHUP_GRADES = {
  great: 'great',
  good: 'good',
  neutral: 'neutral',
  tough: 'tough',
  brutal: 'brutal',
} as const;

/**
 * The matchup rating scale. `neutral` is what a team scores when there is no
 * spread to rank it against, and the two place counts keep a 0-100 score and a
 * rate like OPS from being rounded to the same precision.
 */
export const MATCHUP_SCALE = {
  max: 100,
  neutral: 50,
  scorePlaces: 1,
  valuePlaces: 3,
} as const;

/** Score boundaries (0-100, higher = easier matchup) for each grade, best first. */
export const MATCHUP_GRADE_CUTOFFS = [
  { grade: MATCHUP_GRADES.great, min: 80 },
  { grade: MATCHUP_GRADES.good, min: 60 },
  { grade: MATCHUP_GRADES.neutral, min: 40 },
  { grade: MATCHUP_GRADES.tough, min: 20 },
  { grade: MATCHUP_GRADES.brutal, min: 0 },
] as const;

export const FORM_TRENDS = { hot: 'hot', cold: 'cold', steady: 'steady' } as const;

export const FORM_DEFAULTS = {
  window: 15,
  minWindow: 3,
  maxWindow: 60,
  /** Share of season points-per-game a recent split must beat to count as a trend. */
  trendThreshold: 0.15,
} as const;

export const SCHEDULE_DEFAULTS = { days: 7, maxDays: 21 } as const;

/** Where a preview's team production came from. */
export const PREVIEW_STATS_SOURCES = {
  /** Upstream's own club line. */
  team: 'team',
  /** Summed from the club's players in one stat group. */
  players: 'players',
} as const;

/**
 * A preview is one game, so its lists are short by design: a dozen names and
 * a dozen results would bury the two teams it is comparing.
 */
export const PREVIEW_DEFAULTS = {
  leaders: 5,
  maxLeaders: 10,
  recentGames: 5,
  maxRecentGames: 10,
} as const;

/** Caps for a game-log window, which is filtered in memory rather than fetched. */
export const WINDOW_DEFAULTS = {
  minLastN: 1,
  maxLastN: 60,
  /** Shared games listed game by game; the counts always cover the whole window. */
  maxHeadToHeadGames: 25,
} as const;

/** A head-to-head series is small, so it is not date-capped the way a slate is. */
export const SERIES_DEFAULTS = { maxGames: 30 } as const;

/**
 * Upstream only publishes probable starters a few days out, so anything past
 * that is projected from the player's own rest pattern and labelled as such.
 */
export const START_CONFIDENCE = {
  confirmed: 'confirmed',
  projected: 'projected',
} as const;

export const START_PROJECTION = {
  /** Assumed days between starts when the history is too short to measure. */
  restDays: 5,
  minRestDays: 3,
  maxRestDays: 7,
  /** How many recent starts the rest pattern is measured from. */
  sampleStarts: 5,
  /** Days a projected start may slide to land on a real team game. */
  slackDays: 2,
} as const;

/** Game-log stat that marks an appearance as a start. */
export const START_STAT_KEY = 'gamesStarted';

export const STARTS_COVERAGE = {
  requested: 'requested',
  announced: 'announced',
} as const;

/**
 * The league-wide sweep can only see pitchers upstream has already announced,
 * so it under-reports later in a window. Saying so beats a confident half-answer.
 */
export const STARTS_COVERAGE_NOTES = {
  [STARTS_COVERAGE.requested]:
    "Rest patterns were measured from each pitcher's own game log, so projections follow their actual rotation turn.",
  [STARTS_COVERAGE.announced]:
    'Only pitchers with an already-announced start in this window are covered, and projections assume a league-average rotation turn. Pitchers whose next start has not been announced yet are missing entirely — pass playerIds to check specific pitchers.',
} as const;

export const STARTS_DEFAULTS = {
  /** Cap on how many pitchers one starts report covers. */
  maxPlayers: 40,
  /** Cap on explicit ids, since each one costs a game-log fetch. */
  maxRequestedPlayers: 8,
} as const;

export const SPORT_PROVIDERS = Symbol('SPORT_PROVIDERS');

/** Sort keys that aren't raw stats. */
export const COMPUTED_SORT_KEYS = {
  fantasyPoints: 'fantasyPoints',
  fantasyPointsPerGame: 'fantasyPointsPerGame',
  gamesPlayed: 'gamesPlayed',
  name: 'name',
} as const;

/** Paging for the player directory, which is thousands of rows per sport. */
export const DIRECTORY_QUERY_DEFAULTS = {
  limit: 50,
  maxLimit: 200,
} as const;

export const STATS_QUERY_DEFAULTS = {
  limit: 50,
  maxLimit: 200,
  offset: 0,
  minGames: 0,
} as const;

export const SEASON_PATTERN = /^\d{4}$/;
export const SORT_KEY_PATTERN = /^[A-Za-z0-9_]+$/;
export const MAX_WEEK = 22;
export const SEARCH_MAX_LENGTH = 50;

/** Bump to invalidate every cached, normalized payload after a mapper change. */
export const SPORTS_CACHE_VERSION = 'v7';

export const SPORTS_MESSAGES = {
  unknownGroup: (group: string) => `Unknown stat group "${group}"`,
  /** Names the presets, as unknownTeam does: a bare rejection costs a round. */
  unknownScoring: (scoring: string, known: string[]) =>
    `Unknown scoring preset "${scoring}" — use one of: ${known.join(', ')}`,
  unsupportedKind: (kind: string) => `This sport does not support "${kind}"`,
  weeksUnsupported: 'This sport does not support weekly stats',
  noWindowedStats: (sport: string) =>
    `Leaderboards for "${sport}" cover a whole season only — its upstream publishes no partial-season pool.`,
  windowKindUnsupported: (sport: string, kinds: readonly string[]) =>
    `"${sport}" measures part of a season by ${kinds.join(' or ')}. Ask for a window in those terms.`,
  unknownQualifierStat: (stat: string, keys: string[]) =>
    `Cannot set a minimum on "${stat}" — use one of: ${keys.join(', ')}.`,
  qualified: (stat: string, minimum: number, teamGames: number) =>
    `Ranked among players with at least ${minimum} ${stat} — the league standard scaled to ${teamGames} team games. Pass minStat to set your own line, or minStatValue 0 to rank everyone.`,
  playerNotFound: 'Player not found',
  unknownSeasons: (seasons: string[], known: string[]) =>
    `No data for ${seasons.join(', ')} — this sport covers ${known.at(-1)} to ${known[0]}.`,
  tooManySeasons: (max: number) => `Ask for at most ${max} seasons at a time`,
  noLeagueData: (sport: string) =>
    `No matchup or availability data for "${sport}" — this is only wired up for mlb so far`,
  noStandings: (sport: string) =>
    `No standings for "${sport}" — its upstream publishes no table.`,
  unknownStandingsGroup: (group: string, groups: string[]) =>
    `Unknown division or conference "${group}" — use one of: ${groups.join(', ')}.`,
  noSchedule: (sport: string) =>
    `No schedule data for "${sport}" — its upstream publishes no fixture list.`,
  scheduleNeedsWindow:
    'Give either a date range or a list of weeks, not both — they would filter each other.',
  weeksNeeded: (sport: string) =>
    `"${sport}" has no weeks, so filter its schedule by date instead.`,
  noGamesScheduled: (teams: string[]) =>
    `${teams.join(' and ')} have no games left against each other this season.`,
  previewFromPlayers: (group: string) =>
    `This sport publishes no team-level stats, so each side's line is summed from its ${group.toLowerCase()} players — it covers only the positions in that group.`,
  unknownGame: (gameId: string) =>
    `No game "${gameId}" in this season's schedule for those teams.`,
  badDate: (value: string) => `"${value}" is not a YYYY-MM-DD date`,
  /**
   * Names the sport, not just the teams. A model that omitted `sport` gets the
   * wrong league's club list back and reads it as "NYY is spelled oddly here",
   * retrying with the full name instead of correcting the sport. Saying which
   * league it is looking at is what breaks that loop.
   */
  unknownTeam: (team: string, sport: string, teams: string[]) =>
    `Unknown ${sport} team "${team}". Valid ${sport} teams: ${teams.join(', ')}. If you meant a different sport, pass the "sport" argument.`,
  sameTeam: 'Give two different teams to compare',
  noDatesInLog:
    'This sport\'s game log has no dates, so the date window was ignored — filter by week instead.',
  venueUnknown:
    "This sport's game log does not say which side was at home, so the venue filter was ignored.",
  noGamesInWindow:
    'No games fall inside that window — widen it or drop the filters.',
  neverMet: 'These teams have no games against each other in that window.',
  noPlayerDirectory: (sport: string) =>
    `No player directory for "${sport}" — its upstream publishes no league-wide player list.`,
  noOpportunityData: (sport: string) =>
    `No expected-points model for "${sport}" — the upstream data does not break production down into opportunities. This is only wired up for nfl so far.`,
  noOpportunityGroup: (group: string, groups: string[]) =>
    `The "${group}" group has no opportunity model — points there are not opportunity-driven. Use one of: ${groups.join(', ')}.`,
  unknownExpectedSort: (sort: string, keys: string[]) =>
    `Cannot sort an expected-points board by "${sort}" — use one of: ${keys.join(', ')}.`,
  endBeforeStart: 'endDate must not be before startDate',
  rangeTooLong: (max: number) => `Ask for at most ${max} days at a time`,
} as const;

/**
 * How many seasons one request may span. The warm-up holds ten, so that is what
 * can be answered from cache; more than that is a research project, not a
 * question, and every season is a row in the model's context window.
 */
export const PLAYER_SEASONS_LIMIT = { default: 5, max: 10 } as const;

/**
 * Where an availability answer came from. A club's own roster and the league
 * directory are different populations, and a reader weighs them differently.
 */
export const PLAYER_STATUS_SOURCES = {
  roster: 'roster',
  directory: 'directory',
} as const;

/** Which side of a fixture a game was played on. */
export const VENUES = { home: 'home', away: 'away' } as const;

export const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/** Sort keys for an expected-points board, beyond the raw stat keys. */
export const EXPECTED_SORT_KEYS = {
  expectedPoints: 'expectedPoints',
  expectedPointsPerGame: 'expectedPointsPerGame',
  fantasyPoints: 'fantasyPoints',
  pointsPerGame: 'pointsPerGame',
  delta: 'delta',
  deltaPerGame: 'deltaPerGame',
  efficiency: 'efficiency',
} as const;

/** The pooled model, used for a position with too few players to fit alone. */
export const EXPECTED_POINTS_POOLED = 'ALL';

export const EXPECTED_POINTS_DEFAULTS = {
  /**
   * Fitting on per-game rates from players with almost no sample lets one
   * fluke game set a weight, so a fit needs a few games and a few dozen
   * players. Below that the position falls back to the pooled model.
   */
  minGames: 3,
  minObservations: 20,
  /**
   * Ridge term. Opportunity counts are strongly correlated with each other
   * (air yards ride along with targets), which left alone makes the fit swing
   * between huge offsetting weights. A small penalty keeps them stable
   * without meaningfully biasing the totals.
   */
  ridge: 0.5,
  /**
   * Share of a position's players who must actually see an opportunity before
   * it is priced for them. Below this it is a trick play, not a role.
   */
  minCoverage: 0.1,
  /** Rows the fit is built from, before any position or player filter. */
  population: 1000,
  places: 1,
  weightPlaces: 4,
} as const;
