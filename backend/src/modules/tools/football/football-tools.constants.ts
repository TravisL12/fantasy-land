import { EXPECTED_SORT_KEYS } from '../../sports/sports.constants.js';

export const EXPECTED_POINTS_LIMIT = { default: 15, max: 40 } as const;

export const EXPECTED_SORT_PARAM = {
  type: 'string',
  enum: Object.values(EXPECTED_SORT_KEYS),
  description:
    'What to rank by. Defaults to expectedPointsPerGame. Use "delta" for who has outscored their opportunity (regression candidates) and "delta" ascending, or order "asc", for who has been unlucky.',
} as const;

/**
 * Sent with every board. A small model that sees "expected points" will
 * otherwise describe it as a projection for next week, which it is not: it is
 * what the chances already taken were worth. Saying so once in the result is
 * cheaper than a round spent correcting the answer.
 */
export const EXPECTED_POINTS_METHOD =
  'Expected points = the player\'s opportunities (targets, air yards, carries, red zone chances) priced at what each was worth across this league, season and scoring preset. It measures chances already taken, not a forecast. Actual above expected usually regresses; actual below expected usually rises, if the opportunity holds.';
