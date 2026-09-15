import {
  DATA_KINDS,
  SPORT_KEYS,
  STAT_FORMATS,
} from '../../sports.constants.js';
import type {
  ScoringPreset,
  ScoringRules,
  StatGroup,
} from '../../sports.types.js';
import { defineStat } from '../provider.utils.js';

const { decimal, percent } = STAT_FORMATS;

export const SLEEPER_API = 'https://api.sleeper.com';
export const SLEEPER_STATE_URL = 'https://api.sleeper.app/v1/state/nfl';
export const SLEEPER_SEASON_TYPE = 'regular';
export const NFL_FIRST_SEASON = 2018;
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
};

export const NFL_GROUP_KEYS = {
  offense: 'offense',
  kicking: 'kicking',
  defense: 'defense',
} as const;

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
      defineStat('rec', 'Receptions', 'REC'),
      defineStat('rec_yd', 'Receiving yards', 'REC YD'),
      defineStat('rec_td', 'Receiving TDs', 'REC TD'),
      defineStat('rec_ypr', 'Yards per reception', 'Y/R', decimal),
      defineStat('rec_rz_tgt', 'Red zone targets', 'RZ TGT'),
      defineStat('rush_rz_att', 'Red zone rushes', 'RZ ATT'),
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
