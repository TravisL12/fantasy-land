import {
  DATA_KINDS,
  SPORT_KEYS,
  STAT_FORMATS,
} from '../../sports.constants.js';
import type { ScoringPreset, StatGroup } from '../../sports.types.js';
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
