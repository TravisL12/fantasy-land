import {
  AVAILABILITY,
  DATA_KINDS,
  MATCHUP_SIDES,
  SPORT_KEYS,
  STAT_FORMATS,
} from '../../sports.constants.js';
import type {
  Availability,
  MatchupMetric,
  MatchupSide,
  ScoringPreset,
  StatGroup,
} from '../../sports.types.js';
import { defineStat } from '../provider.utils.js';

const { decimal, innings, rate } = STAT_FORMATS;

export const MLB_API = 'https://statsapi.mlb.com/api/v1';
export const MLB_SPORT_ID = 1;
export const MLB_FIRST_SEASON = 2015;
/** Large enough to return every player in one request (≈750 hitters, ≈900 pitchers). */
export const MLB_STATS_PAGE_SIZE = 3000;

export const MLB_GROUP_KEYS = {
  hitting: 'hitting',
  pitching: 'pitching',
} as const;
export const MLB_PITCHER_POSITION_TYPE = 'Pitcher';
export const MLB_PITCHER_ROLES = { starter: 'SP', reliever: 'RP' } as const;
/** A pitcher counts as a starter when at least this share of appearances were starts. */
export const MLB_STARTER_SHARE = 0.5;

/** Stats the API doesn't return but we derive, e.g. singles for points scoring. */
export const MLB_DERIVED_STATS = { singles: 'singles' } as const;

export const MLB_GROUPS: StatGroup[] = [
  {
    key: MLB_GROUP_KEYS.hitting,
    label: 'Hitting',
    positions: ['C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF', 'DH'],
    stats: [
      defineStat('plateAppearances', 'Plate appearances', 'PA'),
      defineStat('atBats', 'At bats', 'AB'),
      defineStat('runs', 'Runs', 'R'),
      defineStat('hits', 'Hits', 'H'),
      defineStat(MLB_DERIVED_STATS.singles, 'Singles', '1B'),
      defineStat('doubles', 'Doubles', '2B'),
      defineStat('triples', 'Triples', '3B'),
      defineStat('homeRuns', 'Home runs', 'HR'),
      defineStat('rbi', 'Runs batted in', 'RBI'),
      defineStat('baseOnBalls', 'Walks', 'BB'),
      defineStat('strikeOuts', 'Strikeouts', 'K', undefined, {
        lowerIsBetter: true,
      }),
      defineStat('stolenBases', 'Stolen bases', 'SB'),
      defineStat('caughtStealing', 'Caught stealing', 'CS', undefined, {
        lowerIsBetter: true,
      }),
      defineStat('hitByPitch', 'Hit by pitch', 'HBP'),
      defineStat('totalBases', 'Total bases', 'TB'),
      defineStat('avg', 'Batting average', 'AVG', rate),
      defineStat('obp', 'On-base %', 'OBP', rate),
      defineStat('slg', 'Slugging %', 'SLG', rate),
      defineStat('ops', 'OPS', 'OPS', rate),
      defineStat('babip', 'BABIP', 'BABIP', rate),
    ],
    defaultStats: [
      'plateAppearances',
      'runs',
      'homeRuns',
      'rbi',
      'stolenBases',
      'avg',
      'ops',
    ],
  },
  {
    key: MLB_GROUP_KEYS.pitching,
    label: 'Pitching',
    positions: [MLB_PITCHER_ROLES.starter, MLB_PITCHER_ROLES.reliever],
    stats: [
      defineStat('gamesStarted', 'Games started', 'GS'),
      defineStat('inningsPitched', 'Innings pitched', 'IP', innings, {
        summable: true,
      }),
      defineStat('wins', 'Wins', 'W'),
      defineStat('losses', 'Losses', 'L', undefined, { lowerIsBetter: true }),
      defineStat('saves', 'Saves', 'SV'),
      defineStat('holds', 'Holds', 'HLD'),
      defineStat('blownSaves', 'Blown saves', 'BS', undefined, {
        lowerIsBetter: true,
      }),
      defineStat('strikeOuts', 'Strikeouts', 'K'),
      defineStat('baseOnBalls', 'Walks', 'BB', undefined, {
        lowerIsBetter: true,
      }),
      defineStat('hits', 'Hits allowed', 'H', undefined, {
        lowerIsBetter: true,
      }),
      defineStat('homeRuns', 'Home runs allowed', 'HR', undefined, {
        lowerIsBetter: true,
      }),
      defineStat('earnedRuns', 'Earned runs', 'ER', undefined, {
        lowerIsBetter: true,
      }),
      defineStat('era', 'ERA', 'ERA', decimal, { lowerIsBetter: true }),
      defineStat('whip', 'WHIP', 'WHIP', decimal, { lowerIsBetter: true }),
      defineStat('strikeoutsPer9Inn', 'Strikeouts per 9', 'K/9', decimal),
      defineStat('walksPer9Inn', 'Walks per 9', 'BB/9', decimal, {
        lowerIsBetter: true,
      }),
      defineStat('strikeoutWalkRatio', 'K/BB ratio', 'K/BB', decimal),
    ],
    defaultStats: [
      'gamesStarted',
      'inningsPitched',
      'wins',
      'saves',
      'strikeOuts',
      'era',
      'whip',
    ],
  },
];

// Mirrors common head-to-head points league defaults (e.g. ESPN).
export const MLB_SCORING_PRESETS: ScoringPreset[] = [
  {
    key: 'points',
    label: 'Standard points',
    rules: {
      [MLB_GROUP_KEYS.hitting]: {
        [MLB_DERIVED_STATS.singles]: 1,
        doubles: 2,
        triples: 3,
        homeRuns: 4,
        runs: 1,
        rbi: 1,
        baseOnBalls: 1,
        strikeOuts: -1,
        stolenBases: 1,
      },
      [MLB_GROUP_KEYS.pitching]: {
        inningsPitched: 3,
        hits: -1,
        earnedRuns: -2,
        baseOnBalls: -1,
        strikeOuts: 1,
        wins: 2,
        losses: -2,
        saves: 5,
        holds: 2,
      },
    },
  },
];

export const MLB_CATALOG_BASE = {
  key: SPORT_KEYS.mlb,
  name: 'Baseball',
  league: 'MLB',
  dataSource: { name: 'MLB Stats API', url: 'https://statsapi.mlb.com' },
  dataKinds: [DATA_KINDS.stats],
  groups: MLB_GROUPS,
  scoringPresets: MLB_SCORING_PRESETS,
  weeks: null,
  currentWeek: null,
} as const;

/** Roster status codes worth special-casing; everything else falls back by wording. */
export const MLB_STATUS_CODES: Record<string, Availability> = {
  A: AVAILABILITY.active,
  D: AVAILABILITY.injured,
  DL: AVAILABILITY.injured,
  D7: AVAILABILITY.injured,
  D10: AVAILABILITY.injured,
  D15: AVAILABILITY.injured,
  D60: AVAILABILITY.injured,
  RM: AVAILABILITY.minors,
  MIN: AVAILABILITY.minors,
};

/** The API spells injuries several ways ("Injured 10-Day", "Injured - Full Season"). */
export const MLB_STATUS_KEYWORDS: { match: string; availability: Availability }[] =
  [
    { match: 'injured', availability: AVAILABILITY.injured },
    { match: 'bereavement', availability: AVAILABILITY.inactive },
    { match: 'paternity', availability: AVAILABILITY.inactive },
    { match: 'minors', availability: AVAILABILITY.minors },
    { match: 'active', availability: AVAILABILITY.active },
  ];

/**
 * The 40-man, not `fullRoster` — the latter returns the entire farm system
 * (300+ names), while the 40-man still includes 60-day injured-list players.
 */
export const MLB_ROSTER_TYPE = '40Man';

/** Only statuses a fantasy manager can actually roster are worth listing by default. */
export const MLB_RELEVANT_AVAILABILITY: Availability[] = [
  AVAILABILITY.injured,
  AVAILABILITY.inactive,
];

const perGame = (value: number | undefined, games: number) =>
  value === undefined || games === 0 ? undefined : value / games;

/**
 * How friendly each team is to face. Rates are league-relative percentiles, so
 * the exact scale of a metric matters less than its direction.
 */
export const MLB_MATCHUP_METRICS: Record<MatchupSide, MatchupMetric[]> = {
  // A pitcher wants a weak offense: few runs, low OPS, lots of strikeouts.
  [MATCHUP_SIDES.pitching]: [
    {
      key: 'runsPerGame',
      label: 'Opponent runs per game',
      betterWhenHigh: true,
      value: ({ hitting, gamesPlayed }) => perGame(hitting.runs, gamesPlayed),
    },
    {
      key: 'ops',
      label: 'Opponent OPS',
      betterWhenHigh: true,
      value: ({ hitting }) => hitting.ops,
    },
    {
      key: 'strikeoutRate',
      label: 'Opponent strikeout rate',
      betterWhenHigh: false,
      value: ({ hitting }) =>
        hitting.plateAppearances
          ? hitting.strikeOuts / hitting.plateAppearances
          : undefined,
    },
  ],
  // A hitter wants a weak staff: high ERA and WHIP, few strikeouts.
  [MATCHUP_SIDES.hitting]: [
    {
      key: 'era',
      label: 'Opponent ERA',
      betterWhenHigh: false,
      value: ({ pitching }) => pitching.era,
    },
    {
      key: 'whip',
      label: 'Opponent WHIP',
      betterWhenHigh: false,
      value: ({ pitching }) => pitching.whip,
    },
    {
      key: 'strikeoutsPer9Inn',
      label: 'Opponent strikeouts per 9',
      betterWhenHigh: true,
      value: ({ pitching }) => pitching.strikeoutsPer9Inn,
    },
  ],
};

/** Team-level stat keys pulled for matchup ratings. */
export const MLB_TEAM_STAT_KEYS = {
  [MLB_GROUP_KEYS.hitting]: [
    'gamesPlayed',
    'runs',
    'homeRuns',
    'ops',
    'avg',
    'obp',
    'slg',
    'strikeOuts',
    'baseOnBalls',
    'plateAppearances',
  ],
  [MLB_GROUP_KEYS.pitching]: [
    'gamesPlayed',
    'era',
    'whip',
    'strikeOuts',
    'baseOnBalls',
    'homeRuns',
    'strikeoutsPer9Inn',
    'walksPer9Inn',
  ],
} as const;
