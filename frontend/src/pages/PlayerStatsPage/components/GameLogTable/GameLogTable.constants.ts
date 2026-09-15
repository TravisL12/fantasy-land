import type { GameLogEntry } from '@/api/sports';

export const GAME_LOG_COPY = {
  caption: 'Game log',
  empty: 'No games this season.',
  game: 'Game',
  opponent: 'Opp',
  points: 'FPTS',
  pointsTitle: 'Fantasy points',
  totals: 'Totals',
  week: (week: number) => `Week ${week}`,
} as const;

export const GAME_LOG_KEYS = {
  game: 'game',
  opponent: 'opponent',
  points: 'points',
} as const;

export const AWAY_PREFIX = '@ ';

export const gameLabel = ({ week, date }: GameLogEntry) =>
  week ? GAME_LOG_COPY.week(week) : (date ?? '');

export const opponentLabel = ({ opponent, isHome }: GameLogEntry) =>
  opponent ? `${isHome === false ? AWAY_PREFIX : ''}${opponent}` : '';
