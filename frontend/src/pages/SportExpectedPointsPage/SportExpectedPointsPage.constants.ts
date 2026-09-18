export const EXPECTED_PARAMS = {
  season: 'season',
  position: 'position',
  sort: 'sort',
  order: 'order',
  minGames: 'minGames',
} as const;

export const EXPECTED_SORT_KEYS = {
  expectedPointsPerGame: 'expectedPointsPerGame',
  expectedPoints: 'expectedPoints',
  fantasyPoints: 'fantasyPoints',
  pointsPerGame: 'pointsPerGame',
  delta: 'delta',
  deltaPerGame: 'deltaPerGame',
  efficiency: 'efficiency',
} as const;

export const EXPECTED_ROW_LIMIT = 100;
export const DEFAULT_MIN_GAMES = 3;

export const EXPECTED_COPY = {
  caption: 'Production against opportunity',
  empty: 'No players match those filters.',
  positionLabel: 'Position',
  minGamesLabel: 'Min games',
  allPositions: 'All positions',
  /**
   * Said once, above the table. Expected points read as a projection unless
   * you say plainly that they are backward-looking.
   */
  explainer:
    'What each player’s opportunities were worth, priced from this season’s league. It looks back at chances already taken — it is not a projection. Players above their expectation have usually been finishing better than their usage; players below have volume that has not paid off yet.',
  modelsLabel: 'Fitted from',
  model: (position: string, observations: number, rSquared: number) =>
    `${position}: ${observations} players, R² ${rSquared.toFixed(2)}`,
  columns: {
    player: 'Player',
    team: 'Team',
    position: 'Pos',
    games: 'G',
    points: 'FP',
    pointsPerGame: 'FP/G',
    expected: 'xFP',
    expectedPerGame: 'xFP/G',
    delta: '+/-',
    deltaPerGame: '+/- per game',
    efficiency: 'Ratio',
  },
  titles: {
    expected: 'Expected fantasy points from opportunity',
    delta: 'Actual minus expected',
    efficiency: 'Actual divided by expected',
  },
} as const;
