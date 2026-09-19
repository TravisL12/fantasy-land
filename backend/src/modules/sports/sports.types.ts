import type {
  AVAILABILITY,
  CLINCH_STATUS,
  PREVIEW_STATS_SOURCES,
  START_CONFIDENCE,
  DATA_KINDS,
  FORM_TRENDS,
  MATCHUP_GRADES,
  MATCHUP_SIDES,
  SORT_ORDERS,
  SPORT_KEYS,
  STAT_FORMATS,
} from './sports.constants.js';

type ValueOf<T> = T[keyof T];

export type SportKey = ValueOf<typeof SPORT_KEYS>;
export type DataKind = ValueOf<typeof DATA_KINDS>;
export type StatFormat = ValueOf<typeof STAT_FORMATS>;
export type SortOrder = ValueOf<typeof SORT_ORDERS>;

export interface StatDefinition {
  key: string;
  label: string;
  abbr: string;
  format: StatFormat;
  /** Extra names a caller may use for this stat, beyond key, label and abbr. */
  aliases?: readonly string[];
  /** Whether per-game values can be added up into a total (false for rates like AVG). */
  summable: boolean;
  lowerIsBetter?: boolean;
}

export interface StatGroup {
  key: string;
  label: string;
  positions: string[];
  stats: StatDefinition[];
  defaultStats: string[];
}

/** Points per unit of each stat, e.g. `{ rec_yd: 0.1, rec_td: 6 }`. */
export type ScoringRules = Record<string, number>;

export interface ScoringPreset {
  key: string;
  label: string;
  rules: Record<string, ScoringRules>;
}

/**
 * Which optional provider capabilities a sport has, so a client can offer the
 * views that exist rather than hardcoding "this bit is baseball only".
 */
export interface SportCapabilities {
  /** Fixtures: the schedule, head-to-head meetings and game previews. */
  schedule: boolean;
  /** The league table, with each side's clinch and elimination position. */
  standings: boolean;
  /** Matchup ratings, projected starts, roster availability — schedule and more. */
  leagueData: boolean;
  expectedPoints: boolean;
  playerDirectory: boolean;
}

export interface SportCatalog {
  key: SportKey;
  name: string;
  league: string;
  dataSource: { name: string; url: string };
  seasons: string[];
  defaultSeason: string;
  weeks: number[] | null;
  currentWeek: number | null;
  dataKinds: DataKind[];
  groups: StatGroup[];
  scoringPresets: ScoringPreset[];
}

/** A catalog as served over HTTP: the sport's own data plus what it supports. */
export type SportCatalogView = SportCatalog & {
  capabilities: SportCapabilities;
};

export type StatValues = Record<string, number>;

export interface PlayerRef {
  id: string;
  name: string;
  team: string | null;
  position: string | null;
}

export interface StatLine {
  player: PlayerRef;
  gamesPlayed: number;
  stats: StatValues;
}

export interface GameLogEntry {
  date: string | null;
  week: number | null;
  opponent: string | null;
  isHome: boolean | null;
  stats: StatValues;
}

export interface StatLinesQuery {
  season: string;
  week?: number;
  group: string;
  kind: DataKind;
}

export interface GameLogQuery {
  playerId: string;
  season: string;
  group?: string;
}

export interface GameLog {
  player: PlayerRef;
  group: string;
  entries: GameLogEntry[];
}

/**
 * One implementation per sport. Providers own all knowledge of their upstream
 * API and return normalized data; SportsService handles scoring, filtering and sorting.
 */
export interface SportProvider {
  readonly key: SportKey;
  getCatalog(): Promise<SportCatalog>;
  getStatLines(query: StatLinesQuery): Promise<StatLine[]>;
  /** Resolves null when the player doesn't exist upstream. */
  getGameLog(query: GameLogQuery): Promise<GameLog | null>;
}

/**
 * A player as the league's own directory lists them, whether or not they have
 * played: the entry a name search resolves against.
 */
export interface DirectoryPlayer extends PlayerRef {
  /** Stat group they would be scored in, from their position. */
  group: string;
  /** Upstream wording, e.g. "Injured Reserve"; null when it says nothing. */
  status: string | null;
  availability: Availability;
  /**
   * Upstream's own relevance ranking, lower being more relevant. Two players
   * share a surname and only one of them is a starter; without this a search
   * answers with whichever the alphabet put first.
   */
  rank: number | null;
}

/**
 * Optional provider capability: the league's full player list, cached whole
 * rather than fetched a player at a time. Sleeper asks that its ~12k-player
 * payload be pulled at most once a day, which is exactly what a provider with
 * this capability promises to honour.
 */
export interface PlayerDirectoryProvider extends SportProvider {
  getPlayerDirectory(): Promise<DirectoryPlayer[]>;
}

/**
 * Optional provider capability: which stats count as *opportunities* for each
 * stat group, so the expected-points engine can be fit without knowing a thing
 * about the sport. A provider whose upstream does not publish opportunity
 * detail simply omits it, the way LeagueDataProvider is omitted.
 */
export interface OpportunityProvider extends SportProvider {
  readonly opportunityStats: Record<string, string[]>;
}

export type Availability = ValueOf<typeof AVAILABILITY>;
export type MatchupSide = ValueOf<typeof MATCHUP_SIDES>;
export type MatchupGrade = ValueOf<typeof MATCHUP_GRADES>;
export type FormTrend = ValueOf<typeof FORM_TRENDS>;

export interface ProbableStarter {
  playerId: string;
  name: string;
  team: string;
  opponent: string;
  isHome: boolean;
}

export interface ScheduledGame {
  gameId: string;
  date: string;
  /** Fantasy week where the sport has one, null where a date is the only index. */
  week: number | null;
  /** Upstream wording, e.g. "Scheduled", "In Progress", "Final". */
  status: string;
  home: string;
  away: string;
  probables: { home: ProbableStarter | null; away: ProbableStarter | null };
  /** Runs/points once the game is final; null while it is still upcoming. */
  score: { home: number; away: number } | null;
}

export interface DateRange {
  startDate: string;
  endDate: string;
}

/**
 * A window over one season's fixtures. Dates and weeks are both optional
 * because the two sports index games differently: the service sends a date
 * range to a sport without weeks, and weeks to one that has them.
 */
export interface ScheduleQuery extends Partial<DateRange> {
  season: string;
  weeks?: number[];
}

/** Every meeting between two teams, optionally narrowed to part of the season. */
export interface HeadToHeadQuery {
  season: string;
  teams: [string, string];
  startDate?: string;
  endDate?: string;
}

/** Season-to-date team production, the input to matchup ratings. */
export interface TeamStrength {
  team: string;
  gamesPlayed: number;
  hitting: StatValues;
  pitching: StatValues;
}

/**
 * One input to a matchup rating. `value` reads the opposing team's line, and
 * `betterWhenHigh` says whether a high value is good *for the opponent*, so the
 * engine can invert it into a difficulty score for the player we care about.
 */
export interface MatchupMetric {
  key: string;
  label: string;
  betterWhenHigh: boolean;
  value(team: TeamStrength): number | undefined;
}

export interface MatchupRating {
  /** 0-100, where 100 is the easiest matchup in the league for this side. */
  score: number;
  grade: MatchupGrade;
  metrics: { key: string; label: string; value: number; rank: number }[];
}

export type StartConfidence = ValueOf<typeof START_CONFIDENCE>;

export interface ProjectedStart {
  date: string;
  opponent: string;
  isHome: boolean;
  confidence: StartConfidence;
  matchup?: MatchupRating;
}

/** A pitcher's starts across a date window, confirmed and projected together. */
export interface StartsReport {
  player: PlayerRef;
  starts: ProjectedStart[];
  confirmedStarts: number;
  /** Mean matchup score across the window, so two-start weeks can be compared. */
  matchupScore: number | null;
}

export interface PlayerStatus {
  playerId: string;
  name: string;
  team: string | null;
  position: string | null;
  /** Upstream wording, e.g. "Injured 10-Day". */
  status: string;
  availability: Availability;
}

/**
 * Optional provider capability: the fixture list, and the meetings between any
 * two teams. This is the narrow half of what LeagueDataProvider used to be —
 * a sport whose upstream publishes a schedule but no team stats implements
 * this alone rather than being forced to fake the rest.
 */
/**
 * Optional provider capability: the league table. Kept apart from the fixture
 * list because the two come from different places even within one sport —
 * football's schedule is Sleeper's and its table is ESPN's.
 */
export interface StandingsProvider extends SportProvider {
  getStandings(season: string): Promise<StandingsGroup[]>;
}

export interface ScheduleProvider extends SportProvider {
  getSchedule(query: ScheduleQuery): Promise<ScheduledGame[]>;
  getHeadToHead(query: HeadToHeadQuery): Promise<ScheduledGame[]>;
  /**
   * One team's whole season. Asked for separately rather than filtered out of
   * getSchedule because a season-wide slate is thousands of games in baseball
   * and upstream can narrow it to one club for the same single request.
   */
  getTeamGames(query: TeamGamesQuery): Promise<ScheduledGame[]>;
}

export interface TeamGamesQuery extends Partial<DateRange> {
  season: string;
  team: string;
}

/**
 * Optional provider capability: team strength and roster availability, on top
 * of the fixtures. A sport whose upstream has none of this simply doesn't
 * implement it, and SportsService reports that rather than pretending the
 * data exists.
 */
export interface LeagueDataProvider extends ScheduleProvider {
  readonly matchupMetrics: Record<MatchupSide, MatchupMetric[]>;
  /** A date range measures the interval rather than the whole season to date. */
  getTeamStrength(season: string, range?: DateRange): Promise<TeamStrength[]>;
  getPlayerStatuses(season: string): Promise<PlayerStatus[]>;
}

export interface ScoredStatLine extends StatLine {
  fantasyPoints: number;
  fantasyPointsPerGame: number;
}

export interface ScoredGameLogEntry extends GameLogEntry {
  fantasyPoints: number;
}

/** Distribution of per-game fantasy points — the raw material for pick analysis. */
export interface PointsSummary {
  games: number;
  total: number;
  average: number;
  median: number;
  stdDev: number;
  floor: number;
  ceiling: number;
}

/** Recent split measured against the season as a whole. */
export interface FormReport {
  window: number;
  recent: PointsSummary;
  season: PointsSummary;
  /** Recent points per game minus season points per game. */
  delta: number;
  trend: FormTrend;
  recentTotals: StatValues;
}

/**
 * A slice of a season. Dates work for any sport whose game logs carry them,
 * weeks only for sports that have weeks, and `lastN` is applied after both,
 * so "last 5 games in September" means exactly that.
 */
export interface GameWindow {
  startDate?: string;
  endDate?: string;
  weeks?: number[];
  lastN?: number;
}

/** One player's production over a window, on a named scoring preset. */
export interface PlayerSplit {
  player: PlayerRef;
  group: string;
  summary: PointsSummary;
  totals: StatValues;
}

/** One game both (or all) compared players appeared in. */
export interface HeadToHeadGame {
  date: string | null;
  week: number | null;
  points: Record<string, number>;
  /** Player id with the most points, or null when they tied. */
  winner: string | null;
}

export interface HeadToHeadRecord {
  playerId: string;
  name: string;
  wins: number;
  ties: number;
  /** Mean points minus the mean of everyone else's, across shared games. */
  averageMargin: number;
}

/** Only games every compared player played count, so the sample is like-for-like. */
export interface PlayerHeadToHead {
  sharedGames: number;
  records: HeadToHeadRecord[];
  /** Player id that won the most shared games, or null when tied. */
  leader: string | null;
  games: HeadToHeadGame[];
}

export interface SeriesGame {
  gameId: string;
  date: string;
  week: number | null;
  status: string;
  home: string;
  away: string;
  score: { home: number; away: number } | null;
  /** Team abbreviation, or null for a tie or a game that has not been played. */
  winner: string | null;
}

export interface SeriesRecord {
  team: string;
  wins: number;
  losses: number;
  /** Football draws. Left at zero by sports that cannot tie. */
  ties: number;
  scoredFor: number;
  scoredAgainst: number;
  homeWins: number;
  awayWins: number;
}

/** Two teams' meetings over a window, plus the games still to come. */
export interface TeamSeries {
  teams: [string, string];
  played: number;
  upcoming: number;
  nextMeeting: string | null;
  records: [SeriesRecord, SeriesRecord];
  games: SeriesGame[];
}

/**
 * A fitted expected-points model for one position. The weights are measured
 * from the league itself rather than declared, so they follow the scoring
 * preset they were fit under: a PPR target is worth more than a standard one
 * because PPR players really did score more per target.
 */
export interface ExpectedPointsModel {
  /** Position the model was fit for, or ALL for the pooled fallback. */
  position: string;
  observations: number;
  /** Share of the per-game scoring spread the opportunities explain, 0-1. */
  rSquared: number;
  /** Fantasy points per unit of each opportunity stat. */
  weights: StatValues;
}

/** One player's production measured against the opportunity behind it. */
export interface ExpectedPointsLine {
  player: PlayerRef;
  gamesPlayed: number;
  fantasyPoints: number;
  pointsPerGame: number;
  expectedPoints: number;
  expectedPointsPerGame: number;
  /** Actual minus expected: positive means finishing above the opportunity. */
  delta: number;
  deltaPerGame: number;
  /** Actual over expected; 1.0 is exactly what the opportunity implied. */
  efficiency: number | null;
  /** Which model produced the expectation, since positions are fit apart. */
  model: string;
  opportunities: StatValues;
}

/**
 * Where a preview's team production was measured. The two are not the same
 * number: `team` is upstream's own club line, `players` is the sum of that
 * club's individual lines in one stat group, which omits anyone the group
 * doesn't cover. Saying which is which keeps a reader from comparing across
 * sports as though they were.
 */
export type PreviewStatsSource = ValueOf<typeof PREVIEW_STATS_SOURCES>;

/** A team's won-lost line over a window, counted only from finished games. */
export interface TeamRecord {
  wins: number;
  losses: number;
  ties: number;
  scoredFor: number;
  scoredAgainst: number;
}

/** A team's leading fantasy scorer in the previewed window. */
export interface PreviewLeader {
  player: PlayerRef;
  gamesPlayed: number;
  fantasyPoints: number;
  pointsPerGame: number;
  stats: StatValues;
}

/** One side of a game preview. */
export interface PreviewTeam {
  team: string;
  isHome: boolean;
  record: TeamRecord;
  /** Most recent results first, so "how are they going in" is the top of the list. */
  recentGames: SeriesGame[];
  gamesPlayed: number;
  /** Production keyed by stat group, e.g. `{ hitting, pitching }` or `{ offense }`. */
  stats: Record<string, StatValues>;
  statsSource: PreviewStatsSource;
  /** How good a matchup this team is *to face*, where the sport rates matchups. */
  asOpponent?: Record<MatchupSide, MatchupRating | null>;
  leaders: PreviewLeader[];
  /** The announced starting pitcher for the previewed game, where there is one. */
  probable?: ProbableStarter | null;
}

/**
 * Two teams set against each other around one game. The game itself is the
 * next meeting unless one was named, and is null when they have none left —
 * which is a real answer about the fixture list, not a failure.
 */
export interface GamePreview {
  sport: SportKey;
  season: string;
  startDate?: string;
  endDate?: string;
  group: string;
  scoring: string;
  game: SeriesGame | null;
  teams: [PreviewTeam, PreviewTeam];
  series: TeamSeries;
  /** Anything the reader would otherwise have to infer, e.g. a missing capability. */
  notes: string[];
}

export type ClinchStatus = ValueOf<typeof CLINCH_STATUS>;

/**
 * One club's line in the table. Every league publishes some of this and
 * computes the rest; a null is "this league does not say", never zero.
 */
export interface StandingsEntry {
  team: string;
  name: string;
  wins: number;
  losses: number;
  /** Football draws. Always zero where a sport cannot tie. */
  ties: number;
  winPct: number;
  gamesPlayed: number;
  /** Games still to play, where it can be known — the input to a magic number. */
  gamesRemaining: number | null;
  /** Null for the group leader, who is behind nobody. */
  gamesBack: number | null;
  scoredFor: number;
  scoredAgainst: number;
  /** Upstream's own wording, e.g. "W3". */
  streak: string | null;
  /** Position within this group. */
  rank: number;
  /** Seed in the conference or league, where upstream seeds them. */
  playoffSeed: number | null;
  clinch: ClinchStatus;
  /** What was clinched or how they went out, in upstream's own terms. */
  clinchNote: string | null;
  /** Wins plus rival losses still needed to win the group. */
  magicNumber: number | null;
  /** Losses plus rival wins that would end their hold on the group. */
  eliminationNumber: number | null;
  /** The second route in, where the sport has one. */
  wildCard: {
    gamesBack: number | null;
    eliminationNumber: number | null;
  } | null;
}

/** A division, or a whole conference where a sport does not split into them. */
export interface StandingsGroup {
  key: string;
  name: string;
  /** The league or conference it sits in, e.g. "AL" or "AFC". */
  conference: string | null;
  teams: StandingsEntry[];
}

export interface StandingsReport {
  sport: SportKey;
  season: string;
  groups: StandingsGroup[];
  /** How the clinch numbers were arrived at — published, or computed here. */
  method: string;
}
