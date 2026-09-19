import {
  AVAILABILITY,
  DATA_KINDS,
  SPORT_KEYS,
  STAT_FORMATS,
} from '../../sports.constants.js';
import type {
  Availability,
  ScoringPreset,
  ScoringRules,
  StatGroup,
} from '../../sports.types.js';
import { defineStat } from '../provider.utils.js';

const { decimal, percent } = STAT_FORMATS;

export const SLEEPER_API = 'https://api.sleeper.com';
export const SLEEPER_STATE_URL = 'https://api.sleeper.app/v1/state/nfl';
/**
 * The whole league in one payload (~14MB, ~12k players). Sleeper asks that it
 * be pulled at most once a day, so it is cached for a day and normalized down
 * to the fantasy-eligible players before it is stored.
 */
export const SLEEPER_PLAYERS_URL = 'https://api.sleeper.app/v1/players/nfl';

/** A whole season of fixtures in one ~27KB payload, keyed by week. */
export const sleeperScheduleUrl = (season: string) =>
  `https://api.sleeper.app/schedule/nfl/${SLEEPER_SEASON_TYPE}/${season}`;

/**
 * Sleeper publishes the fixture list but never a score, so finals come from
 * ESPN's public scoreboard — one request per week, cached like any other
 * normalized payload, and only for weeks that actually contain a finished
 * game. A season that is over is fetched once and then never again.
 */
export const espnScoreboardUrl = (season: string, week: number) =>
  'https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard' +
  `?dates=${season}&seasontype=${ESPN_REGULAR_SEASON_TYPE}&week=${week}`;

const ESPN_REGULAR_SEASON_TYPE = 2;

/**
 * The table, also from ESPN — Sleeper publishes no standings at all. `level=3`
 * is what splits the two conferences into their four divisions each; without
 * it every club comes back in one flat conference list.
 */
export const espnStandingsUrl = (season: string) =>
  'https://site.api.espn.com/apis/v2/sports/football/nfl/standings' +
  `?season=${season}&level=3`;

/** Games each club plays, the base of a magic number. */
export const NFL_SEASON_GAMES = 17;

/**
 * ESPN's one-letter shorthand, in words. It appears only once a club's place
 * is settled, which is why the numbers behind it are computed here rather
 * than waited for.
 */
export const NFL_CLINCH_NOTES: Record<string, string> = {
  '*': 'Clinched best record',
  z: 'Clinched division and a first-round bye',
  y: 'Clinched playoff berth',
  x: 'Clinched playoff berth',
  e: 'Eliminated from playoff contention',
};

/** The letter that means out; every other letter means in. */
export const NFL_ELIMINATED_INDICATOR = 'e';


/**
 * The two sources disagree on exactly one club abbreviation, so the mapping is
 * a single entry rather than a table: everything else matches Sleeper already.
 */
export const ESPN_TEAM_ALIASES: Record<string, string> = { WSH: 'WAS' };

/**
 * Sleeper's own status wording, turned into the same plain words MLB's feed
 * uses, so `status` reads the same whatever sport produced the game. Anything
 * unrecognized passes through as upstream wrote it rather than being guessed.
 */
export const NFL_GAME_STATUSES: Record<string, string> = {
  pre_game: 'Scheduled',
  in_game: 'In Progress',
  complete: 'Final',
  canceled: 'Canceled',
  postponed: 'Postponed',
};

/** The status that means a game is over and its score is a result. */
export const NFL_FINAL_STATUS = 'complete';
/**
 * The mapped statuses of a game that will still be played. A canceled fixture
 * carries no score and never will, so counting it as one still to come would
 * put a club's season at eighteen games and inflate every magic number in its
 * division by one.
 */
export const NFL_UPCOMING_STATUSES = [
  NFL_GAME_STATUSES.pre_game,
  NFL_GAME_STATUSES.in_game,
];


/**
 * Statuses a game never leaves. A canceled game has no score and never will,
 * so a week holding one is still finished — counting only finals would leave
 * that week re-fetching its scoreboard for the rest of the season.
 */
export const NFL_SETTLED_STATUSES = ['complete', 'canceled', 'postponed'];

/** Positions worth keeping from the directory; the rest never score points. */
export const NFL_FANTASY_POSITIONS = ['QB', 'RB', 'WR', 'TE', 'K', 'DEF'];

/**
 * Upstream roster and game-status wording, mapped onto the availability
 * vocabulary every sport shares. A practice-squad player is "in the minors"
 * in the only sense this app cares about: not on the active roster.
 */
export const NFL_AVAILABILITY: Record<string, Availability> = {
  Active: AVAILABILITY.active,
  Inactive: AVAILABILITY.inactive,
  'Injured Reserve': AVAILABILITY.injured,
  'Physically Unable to Perform': AVAILABILITY.injured,
  'Non Football Injury': AVAILABILITY.injured,
  'Practice Squad': AVAILABILITY.minors,
  'Practice Squad Injured': AVAILABILITY.injured,
  Reserve: AVAILABILITY.inactive,
};

/** A game-status designation overrides an otherwise active roster status. */
export const NFL_INJURY_STATUSES = ['IR', 'Out', 'Doubtful', 'PUP', 'NA'];
export const SLEEPER_SEASON_TYPE = 'regular';
/**
 * Sleeper serves weekly stats well before this, but 2017 is where the fields
 * the expected-points model reads start appearing (air yards and red zone
 * targets are there; snap counts and red zone carries are not). Ten seasons is
 * also what the warm-up pulls, so the two line up.
 */
export const NFL_FIRST_SEASON = 2017;
export const NFL_REGULAR_SEASON_WEEKS = 18;

/**
 * Rate stats rebuilt after summing weekly lines: [numerator, denominator, multiplier].
 * Sleeper's own season totals lag behind during the season, so we aggregate weeks ourselves.
 */
export const NFL_DERIVED_RATES: Record<string, [string, string, number]> = {
  cmp_pct: ['pass_cmp', 'pass_att', 100],
  pass_ypa: ['pass_yd', 'pass_att', 1],
  rush_ypa: ['rush_yd', 'rush_att', 1],
  rec_ypr: ['rec_yd', 'rec', 1],
  adot: ['rec_air_yd', 'rec_tgt', 1],
  snap_pct: ['off_snp', 'tm_off_snp', 100],
};

export const NFL_GROUP_KEYS = {
  offense: 'offense',
  kicking: 'kicking',
  defense: 'defense',
} as const;

/**
 * The opportunity stats an expected-points model is fit on, per stat group.
 *
 * These are the chances a player was given, not what they did with them:
 * volume plus the two things that change what a chance is worth — how far
 * downfield it was thrown (air yards) and whether it came in the red zone.
 * Yards and touchdowns are deliberately absent, since they are the outcome
 * the model is trying to explain. Only offense has a model; a kicker's or a
 * defense's points are not opportunity-driven in the same way.
 */
export const NFL_OPPORTUNITY_STATS: Record<string, string[]> = {
  offense: [
    'rec_tgt',
    'rec_air_yd',
    'rec_rz_tgt',
    'rush_att',
    'rush_rz_att',
    'pass_att',
    'pass_air_yd',
    'pass_rz_att',
  ],
};

export const NFL_GROUPS: StatGroup[] = [
  {
    key: NFL_GROUP_KEYS.offense,
    label: 'Offense',
    positions: ['QB', 'RB', 'WR', 'TE'],
    stats: [
      defineStat('off_snp', 'Offensive snaps', 'SNP'),
      defineStat('pass_att', 'Pass attempts', 'ATT'),
      defineStat('pass_cmp', 'Completions', 'CMP'),
      defineStat('cmp_pct', 'Completion %', 'CMP%', percent),
      defineStat('pass_yd', 'Passing yards', 'PASS YD'),
      defineStat('pass_td', 'Passing TDs', 'PASS TD'),
      defineStat('pass_int', 'Interceptions', 'INT', undefined, {
        lowerIsBetter: true,
      }),
      defineStat('pass_ypa', 'Yards per attempt', 'Y/A', decimal),
      defineStat('rush_att', 'Rush attempts', 'RUSH'),
      defineStat('rush_yd', 'Rushing yards', 'RUSH YD'),
      defineStat('rush_td', 'Rushing TDs', 'RUSH TD'),
      defineStat('rush_ypa', 'Yards per carry', 'Y/C', decimal),
      defineStat('rec_tgt', 'Targets', 'TGT'),
      defineStat('rec_air_yd', 'Air yards', 'AIR', undefined, {
        aliases: ['receiving air yards'],
      }),
      defineStat('adot', 'Average depth of target', 'aDOT', decimal),
      defineStat('rec', 'Receptions', 'REC'),
      defineStat('rec_yd', 'Receiving yards', 'REC YD'),
      defineStat('rec_td', 'Receiving TDs', 'REC TD'),
      defineStat('rec_ypr', 'Yards per reception', 'Y/R', decimal),
      defineStat('rec_rz_tgt', 'Red zone targets', 'RZ TGT'),
      defineStat('rush_rz_att', 'Red zone rushes', 'RZ ATT'),
      defineStat('pass_rz_att', 'Red zone pass attempts', 'RZ PASS'),
      defineStat('pass_air_yd', 'Passing air yards', 'PASS AIR'),
      defineStat('rec_fd', 'Receiving first downs', 'REC FD'),
      defineStat('rush_fd', 'Rushing first downs', 'RUSH FD'),
      defineStat('tm_off_snp', 'Team offensive snaps', 'TM SNP'),
      defineStat('snap_pct', 'Snap share', 'SNP%', percent),
      defineStat('st_td', 'Return TDs', 'RET TD'),
      defineStat('fum_rec_td', 'Fumble recovery TDs', 'FR TD'),
      defineStat('fum_lost', 'Fumbles lost', 'FL', undefined, {
        lowerIsBetter: true,
      }),
      defineStat('pass_2pt', 'Passing 2PT', 'P2PT'),
      defineStat('rush_2pt', 'Rushing 2PT', 'R2PT'),
      defineStat('rec_2pt', 'Receiving 2PT', 'REC2PT'),
    ],
    defaultStats: [
      'pass_yd',
      'pass_td',
      'rush_yd',
      'rush_td',
      'rec_tgt',
      'rec',
      'rec_yd',
      'rec_td',
    ],
  },
  {
    key: NFL_GROUP_KEYS.kicking,
    label: 'Kicking',
    positions: ['K'],
    stats: [
      defineStat('fgm', 'Field goals made', 'FGM'),
      defineStat('fga', 'Field goals attempted', 'FGA'),
      defineStat('fgm_0_19', 'FGM 0-19', '0-19'),
      defineStat('fgm_20_29', 'FGM 20-29', '20-29'),
      defineStat('fgm_30_39', 'FGM 30-39', '30-39'),
      defineStat('fgm_40_49', 'FGM 40-49', '40-49'),
      defineStat('fgm_50p', 'FGM 50+', '50+'),
      defineStat('fgmiss', 'Field goals missed', 'MISS', undefined, {
        lowerIsBetter: true,
      }),
      defineStat('xpm', 'Extra points made', 'XPM'),
      defineStat('xpa', 'Extra points attempted', 'XPA'),
      defineStat('xpmiss', 'Extra points missed', 'XPMISS', undefined, {
        lowerIsBetter: true,
      }),
    ],
    defaultStats: ['fgm', 'fga', 'fgm_40_49', 'fgm_50p', 'xpm', 'xpa'],
  },
  {
    key: NFL_GROUP_KEYS.defense,
    label: 'Team defense',
    positions: ['DEF'],
    stats: [
      defineStat('sack', 'Sacks', 'SACK'),
      defineStat('int', 'Interceptions', 'INT'),
      defineStat('fum_rec', 'Fumble recoveries', 'FR'),
      defineStat('ff', 'Forced fumbles', 'FF'),
      defineStat('def_td', 'Defensive TDs', 'TD'),
      defineStat('def_st_td', 'Special teams TDs', 'ST TD'),
      defineStat('safe', 'Safeties', 'SAF'),
      defineStat('blk_kick', 'Blocked kicks', 'BLK'),
      defineStat('pts_allow', 'Points allowed', 'PA', undefined, {
        lowerIsBetter: true,
      }),
      defineStat('yds_allow', 'Yards allowed', 'YA', undefined, {
        lowerIsBetter: true,
      }),
      defineStat('qb_hit', 'QB hits', 'QBH'),
      defineStat('tkl_loss', 'Tackles for loss', 'TFL'),
      // Tier flags drive points-allowed scoring; not shown by default.
      defineStat('pts_allow_0', 'Shutouts', 'PA 0'),
      defineStat('pts_allow_1_6', 'Games allowing 1-6', 'PA 1-6'),
      defineStat('pts_allow_7_13', 'Games allowing 7-13', 'PA 7-13'),
      defineStat('pts_allow_14_20', 'Games allowing 14-20', 'PA 14-20'),
      defineStat('pts_allow_21_27', 'Games allowing 21-27', 'PA 21-27'),
      defineStat('pts_allow_28_34', 'Games allowing 28-34', 'PA 28-34'),
      defineStat('pts_allow_35p', 'Games allowing 35+', 'PA 35+'),
      defineStat('def_st_ff', 'Special teams forced fumbles', 'ST FF'),
      defineStat('def_st_fum_rec', 'Special teams fumble recoveries', 'ST FR'),
    ],
    defaultStats: [
      'sack',
      'int',
      'fum_rec',
      'def_td',
      'pts_allow',
      'yds_allow',
    ],
  },
];

// Sleeper's default league scoring — verified to reproduce Sleeper's own pts_* values.
const offenseRules = (pointsPerReception: number): ScoringRules => ({
  pass_yd: 0.04,
  pass_td: 4,
  pass_int: -1,
  pass_2pt: 2,
  rush_yd: 0.1,
  rush_td: 6,
  rush_2pt: 2,
  rec: pointsPerReception,
  rec_yd: 0.1,
  rec_td: 6,
  rec_2pt: 2,
  st_td: 6,
  fum_rec_td: 6,
  fum_lost: -2,
});

const KICKING_RULES: ScoringRules = {
  fgm_0_19: 3,
  fgm_20_29: 3,
  fgm_30_39: 3,
  fgm_40_49: 4,
  fgm_50p: 5,
  xpm: 1,
  fgmiss: -1,
  xpmiss: -1,
};

const DEFENSE_RULES: ScoringRules = {
  sack: 1,
  int: 2,
  fum_rec: 2,
  ff: 1,
  def_td: 6,
  def_st_td: 6,
  def_st_ff: 1,
  def_st_fum_rec: 1,
  safe: 2,
  blk_kick: 2,
  pts_allow_0: 10,
  pts_allow_1_6: 7,
  pts_allow_7_13: 4,
  pts_allow_28_34: -1,
  pts_allow_35p: -4,
};

const preset = (key: string, label: string, ppr: number): ScoringPreset => ({
  key,
  label,
  rules: {
    [NFL_GROUP_KEYS.offense]: offenseRules(ppr),
    [NFL_GROUP_KEYS.kicking]: KICKING_RULES,
    [NFL_GROUP_KEYS.defense]: DEFENSE_RULES,
  },
});

export const NFL_SCORING_PRESETS: ScoringPreset[] = [
  preset('ppr', 'PPR', 1),
  preset('half_ppr', 'Half PPR', 0.5),
  preset('std', 'Standard', 0),
];

export const NFL_CATALOG_BASE = {
  key: SPORT_KEYS.nfl,
  name: 'Football',
  league: 'NFL',
  dataSource: { name: 'Sleeper', url: 'https://sleeper.com' },
  dataKinds: [DATA_KINDS.stats, DATA_KINDS.projections],
  groups: NFL_GROUPS,
  scoringPresets: NFL_SCORING_PRESETS,
} as const;
