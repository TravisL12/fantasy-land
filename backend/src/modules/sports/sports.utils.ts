import { BadRequestException } from '@nestjs/common';
import {
  COMPUTED_SORT_KEYS,
  DATE_PATTERN,
  EXPECTED_SORT_KEYS,
  SCHEDULE_DEFAULTS,
  SORT_ORDERS,
  SPORTS_MESSAGES,
} from './sports.constants.js';
import type {
  DirectoryPlayer,
  ExpectedPointsLine,
  LeagueDataProvider,
  OpportunityProvider,
  PlayerDirectoryProvider,
  ScheduleProvider,
  ScoredStatLine,
  SortOrder,
  SportCapabilities,
  SportCatalog,
  SportProvider,
  StandingsGroup,
  StandingsProvider,
  StatDefinition,
  StatGroup,
} from './sports.types.js';

/**
 * A capability is a method (or a field) the base provider does not declare, so
 * one marker per capability is the whole of the test. Writing them this way
 * keeps the narrowing guard and the catalog's `capabilities` block reading
 * from the same list rather than drifting apart.
 */
const capability =
  <T extends SportProvider>(marker: string) =>
  (provider: SportProvider): provider is T =>
    marker in provider;

/** Narrows a provider to the optional team-strength and availability capability. */
export const providesLeagueData = capability<LeagueDataProvider>('getTeamStrength');

/**
 * Narrows a provider to the fixture list alone. Checked separately from league
 * data because a sport can publish a schedule without publishing team stats,
 * which is exactly where NFL sits.
 */
export const providesSchedule = capability<ScheduleProvider>('getSchedule');

/** Narrows a provider to the optional league table. */
export const providesStandings = capability<StandingsProvider>('getStandings');

/** Narrows a provider to the optional whole-league player list. */
export const providesPlayerDirectory =
  capability<PlayerDirectoryProvider>('getPlayerDirectory');

/** Narrows a provider to the optional expected-points capability. */
export const providesOpportunityStats =
  capability<OpportunityProvider>('opportunityStats');

/**
 * Keyed by the capability block clients read, so adding a capability is one
 * entry here and one field on SportCapabilities — the compiler asks for the
 * other half rather than leaving a catalog that quietly never reports it.
 */
const CAPABILITY_GUARDS: Record<
  keyof SportCapabilities,
  (provider: SportProvider) => boolean
> = {
  schedule: providesSchedule,
  standings: providesStandings,
  leagueData: providesLeagueData,
  expectedPoints: providesOpportunityStats,
  playerDirectory: providesPlayerDirectory,
};

/** Which optional capabilities one provider actually implements. */
export const capabilitiesOf = (provider: SportProvider): SportCapabilities =>
  Object.fromEntries(
    Object.entries(CAPABILITY_GUARDS).map(([name, has]) => [
      name,
      has(provider),
    ]),
  ) as unknown as SportCapabilities;

const DAY_MS = 24 * 60 * 60 * 1000;

export const toIsoDate = (date: Date) => date.toISOString().slice(0, 10);

export const addDays = (isoDate: string, days: number) =>
  toIsoDate(new Date(Date.parse(`${isoDate}T00:00:00Z`) + days * DAY_MS));

export const daysBetween = (start: string, end: string) =>
  Math.round(
    (Date.parse(`${end}T00:00:00Z`) - Date.parse(`${start}T00:00:00Z`)) / DAY_MS,
  );

const parseDate = (value: string) => {
  if (!DATE_PATTERN.test(value) || Number.isNaN(Date.parse(value))) {
    throw new BadRequestException(SPORTS_MESSAGES.badDate(value));
  }
  return value;
};

/** Validates an optional date, so a bad one is rejected before it is sent upstream. */
export const assertIsoDate = (value: string | undefined) =>
  value === undefined ? undefined : parseDate(value);

/**
 * Validates an open-ended window. Unlike a slate, a head-to-head or a game-log
 * slice is small however long the interval is, so there is no length cap here.
 */
export const assertRange = (
  startDate: string | undefined,
  endDate: string | undefined,
) => {
  const start = assertIsoDate(startDate);
  const end = assertIsoDate(endDate);
  if (start && end && daysBetween(start, end) < 0) {
    throw new BadRequestException(SPORTS_MESSAGES.endBeforeStart);
  }
  return { startDate: start, endDate: end };
};

/**
 * Validates a date window and caps its length — an uncapped range would pull
 * hundreds of games into the model's context.
 */
export const resolveDateRange = (
  startDate: string | undefined,
  endDate: string | undefined,
  days: number = SCHEDULE_DEFAULTS.days,
) => {
  const start = parseDate(startDate ?? toIsoDate(new Date()));
  const end = parseDate(endDate ?? addDays(start, days - 1));
  const span = daysBetween(start, end);

  if (span < 0) throw new BadRequestException(SPORTS_MESSAGES.endBeforeStart);
  if (span >= SCHEDULE_DEFAULTS.maxDays) {
    throw new BadRequestException(
      SPORTS_MESSAGES.rangeTooLong(SCHEDULE_DEFAULTS.maxDays),
    );
  }
  return { startDate: start, endDate: end };
};

/**
 * A key as the model wrote it, flattened to just its letters and digits, so
 * "strikeOuts", "strikeouts", "strike_outs" and "Strike Outs" are one token.
 */
export const flattenKey = (value: string) =>
  value.toLowerCase().replace(/[^a-z0-9]/g, '');

/** The canonical spelling of `requested`, or undefined if it names nothing. */
export const matchKey = (keys: readonly string[], requested: string) =>
  keys.find((key) => key === requested) ??
  keys.find((key) => flattenKey(key) === flattenKey(requested));

/**
 * Stat keys come from upstream, so they read like `strikeOuts`, `rec_yd` or
 * `pts_allow_35p`. A model asked about strikeouts writes the English word and
 * the lookup fails on capitalisation alone. Every name a stat already carries
 * — key, aliases, abbreviation, label — is indexed flattened, so "strikeouts",
 * "SO" and "K" all land on `strikeOuts`, and "receiving yards" on `rec_yd`.
 *
 * A token two stats in the group would both claim is dropped rather than
 * guessed at: an ambiguous name falls through to the usual "valid keys" error.
 */
export const resolveStatKey = (
  group: StatGroup,
  requested: string,
): string | undefined =>
  group.stats.find(({ key }) => key === requested)?.key ??
  statKeyIndex(group).get(flattenKey(requested)) ??
  undefined;

/** Flattened name → canonical key, or null where the name is ambiguous. */
type StatKeyIndex = Map<string, string | null>;

const statKeyIndexes = new WeakMap<StatGroup, StatKeyIndex>();

/** Weakest name first: a later source overwrites an earlier one, so a stat's
 * own key always beats another stat's label. */
const STAT_NAMES: ((stat: StatDefinition) => readonly (string | undefined)[])[] =
  [
    ({ label }) => [label],
    ({ abbr }) => [abbr],
    ({ aliases }) => aliases ?? [],
    ({ key }) => [key],
  ];

const statKeyIndex = (group: StatGroup) => {
  const cached = statKeyIndexes.get(group);
  if (cached) return cached;

  const index: StatKeyIndex = new Map();
  for (const names of STAT_NAMES) {
    const source: StatKeyIndex = new Map();
    for (const stat of group.stats) {
      for (const name of names(stat)) {
        const token = name && flattenKey(name);
        if (!token) continue;
        const claimed = source.get(token);
        source.set(token, claimed && claimed !== stat.key ? null : stat.key);
      }
    }
    for (const [token, key] of source) index.set(token, key);
  }

  statKeyIndexes.set(group, index);
  return index;
};

/**
 * A name as a person types it, reduced to letters and digits. Accents are
 * folded first, so "Amon-Ra" matches "amonra" and "Ekelér" matches "ekeler" —
 * a search that only works when the apostrophe is in the right place is not a
 * search a model or a person can use.
 */
const flattenName = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');

/**
 * How well a directory entry answers a name, best first. The tiers matter more
 * than they look: searching "Allen" should reach Josh Allen before every
 * player whose name merely contains the letters, and a full-name match should
 * beat a surname one.
 */
const nameScore = (name: string, query: string) => {
  const flat = flattenName(name);
  const words = name.split(/\s+/).map(flattenName);

  if (flat === query) return 0;
  // A whole name someone actually goes by beats a longer name that merely
  // starts the same way: "chase" is Ja'Marr Chase, not Chasen Hines.
  if (words.includes(query)) return 1;
  if (flat.startsWith(query)) return 2;
  if (words.some((word) => word.startsWith(query))) return 3;
  return flat.includes(query) ? 4 : Infinity;
};

/**
 * Players whose name matches, best match first. Ties break on upstream's own
 * relevance ranking rather than the alphabet, so a search for a shared surname
 * answers with the starter rather than whoever sorts first; entries upstream
 * never ranked sink below those it did.
 */
export const matchPlayers = (
  players: DirectoryPlayer[],
  query: string,
  limit: number,
): DirectoryPlayer[] => {
  const flat = flattenName(query);
  if (!flat) return [];

  return players
    .flatMap((player) => {
      const score = nameScore(player.name, flat);
      return score === Infinity ? [] : [{ player, score }];
    })
    .sort(
      (a, b) =>
        a.score - b.score ||
        (a.player.rank ?? Infinity) - (b.player.rank ?? Infinity) ||
        a.player.name.localeCompare(b.player.name),
    )
    .slice(0, limit)
    .map(({ player }) => player);
};

/** Group and preset keys match loosely, so "Pitching" still finds "pitching". */
export const resolveGroup = (catalog: SportCatalog, key?: string) => {
  const match = key && matchKey(catalog.groups.map((g) => g.key), key);
  const group = key
    ? catalog.groups.find((g) => g.key === match)
    : catalog.groups[0];
  if (!group)
    throw new BadRequestException(SPORTS_MESSAGES.unknownGroup(key ?? ''));
  return group;
};

export const resolveScoring = (catalog: SportCatalog, key?: string) => {
  if (!key) return catalog.scoringPresets[0];

  // Label as well as key, so "half ppr" and "Standard points" both land.
  const match = matchKey(
    catalog.scoringPresets.flatMap((preset) => [preset.key, preset.label]),
    key,
  );
  const preset = catalog.scoringPresets.find(
    ({ key: presetKey, label }) => presetKey === match || label === match,
  );
  if (!preset) {
    throw new BadRequestException(
      SPORTS_MESSAGES.unknownScoring(
        key,
        catalog.scoringPresets.map((p) => p.key),
      ),
    );
  }
  return preset;
};

/** Abbreviations are case-insensitive, and a wrong one lists the valid ones. */
export const resolveTeam = (team: string, known: string[]) => {
  const match = known.find(
    (candidate) => candidate.toUpperCase() === team.trim().toUpperCase(),
  );
  if (!match) {
    throw new BadRequestException(SPORTS_MESSAGES.unknownTeam(team, known));
  }
  return match;
};

/**
 * A table narrowed to one division or one conference. Matching both means
 * "AFC" and "AFC East" are each a thing you can ask for, and an unknown name
 * comes back with the list rather than an empty table that reads as "nobody
 * is in that division".
 */
export const narrowStandings = (groups: StandingsGroup[], group?: string) => {
  if (!group) return groups;

  // A division answers to its key and to its printed name, because "ALE" is
  // how upstream spells it and "AL East" is how everyone else does.
  const names = [
    ...new Set(
      groups.flatMap(({ key, name, conference }) => [
        key,
        name,
        ...(conference ? [conference] : []),
      ]),
    ),
  ].filter(Boolean);
  const match = matchKey(names, group);
  const narrowed = match
    ? groups.filter(
        ({ key, name, conference }) =>
          key === match || name === match || conference === match,
      )
    : [];

  if (!narrowed.length) {
    throw new BadRequestException(
      SPORTS_MESSAGES.unknownStandingsGroup(group, names),
    );
  }
  return narrowed;
};

/**
 * An expected-points board is only sortable by its own computed columns, and a
 * name that is not one of them is rejected with the list — the same rule the
 * leaderboard follows, and for the same reason: a board sorted by something
 * other than what was asked for still reads as a real ranking.
 */
export const resolveExpectedSort = (sort: string | undefined) => {
  const keys = Object.values(EXPECTED_SORT_KEYS);
  if (!sort) return EXPECTED_SORT_KEYS.expectedPointsPerGame;

  const match = matchKey(keys, sort);
  if (!match) {
    throw new BadRequestException(
      SPORTS_MESSAGES.unknownExpectedSort(sort, keys),
    );
  }
  return match;
};

const sortValue = (
  row: ScoredStatLine,
  key: string,
): number | string | undefined => {
  switch (key) {
    case COMPUTED_SORT_KEYS.name:
      return row.player.name;
    case COMPUTED_SORT_KEYS.fantasyPoints:
    case COMPUTED_SORT_KEYS.fantasyPointsPerGame:
    case COMPUTED_SORT_KEYS.gamesPlayed:
      return row[key];
    default:
      return row.stats[key];
  }
};

/** Missing values always sink to the bottom; ties fall back to name. */
export const compareRows =
  (key: string, order: SortOrder) => (a: ScoredStatLine, b: ScoredStatLine) => {
    const av = sortValue(a, key);
    const bv = sortValue(b, key);
    if (av === undefined || bv === undefined) {
      if (av === bv) return a.player.name.localeCompare(b.player.name);
      return av === undefined ? 1 : -1;
    }
    const direction = order === SORT_ORDERS.asc ? 1 : -1;
    const diff =
      typeof av === 'string' || typeof bv === 'string'
        ? String(av).localeCompare(String(bv))
        : av - bv;
    return diff * direction || a.player.name.localeCompare(b.player.name);
  };

/** Ties fall back to name, and a null efficiency sinks, as elsewhere. */
export const compareExpected =
  (key: string, order: SortOrder) =>
  (a: ExpectedPointsLine, b: ExpectedPointsLine) => {
    const av = a[key as keyof ExpectedPointsLine];
    const bv = b[key as keyof ExpectedPointsLine];
    if (typeof av !== 'number' || typeof bv !== 'number') {
      if (typeof av === typeof bv)
        return a.player.name.localeCompare(b.player.name);
      return typeof av === 'number' ? -1 : 1;
    }
    const direction = order === SORT_ORDERS.asc ? 1 : -1;
    return (av - bv) * direction || a.player.name.localeCompare(b.player.name);
  };
