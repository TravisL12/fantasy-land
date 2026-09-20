import type { ScoredStatLine } from '../sports.types.js';

/** Where one player sits among the players they are actually competing with. */
export interface LeagueContext {
  /** The position the comparison was drawn within, null when unpositioned. */
  position: string | null;
  /** How many players the rank is out of. */
  pool: number;
  rank: number;
  /** 0-100, where 100 is the top of the position. */
  percentile: number;
  /** What the middle of this position scored, for a sense of the distribution. */
  median: number;
  /** Only when a baseline rank was asked for — see replacementLevel. */
  replacement?: ReplacementLevel;
}

export interface ReplacementLevel {
  /** The baseline rank, as the caller defined it. */
  rank: number;
  fantasyPoints: number;
  /** This player's points above that baseline. Negative means below it. */
  valueOver: number;
}

const round = (value: number) => Math.round(value * 10) / 10;

const byPoints = (a: ScoredStatLine, b: ScoredStatLine) =>
  b.fantasyPoints - a.fantasyPoints;

/**
 * A raw total says nothing on its own. Twenty-two points is a fine week for a
 * tight end and a poor one for a quarterback, and a model with no sense of the
 * distribution will confidently call either one good.
 *
 * The comparison is drawn within the player's own position, because that is the
 * pool they are actually chosen from — ranking a kicker against running backs
 * measures the sport, not the player. A player whose position is unknown is
 * ranked against the whole group rather than not at all.
 *
 * `replacementRank` is the caller's, never a default: replacement level depends
 * on how many teams are in the league and how many of each position they start,
 * which this engine has no way to know. Asked without one, it reports the rank
 * and the percentile and leaves value over replacement alone rather than
 * inventing a baseline the reader would take for a standard.
 */
export const leagueContext = (
  pool: readonly ScoredStatLine[],
  playerId: string,
  options: { replacementRank?: number } = {},
): LeagueContext | null => {
  const player = pool.find(({ player: { id } }) => id === playerId);
  if (!player) return null;

  const position = player.player.position;
  const peers = position
    ? pool.filter(({ player: p }) => p.position === position)
    : [...pool];
  const ranked = peers.sort(byPoints);

  const rank = ranked.findIndex(({ player: { id } }) => id === playerId) + 1;
  if (rank === 0) return null;

  const pool_ = ranked.length;
  // Rank 1 of N is the 100th percentile, rank N the 0th: the share of the
  // position this player finished ahead of.
  const percentile = pool_ === 1 ? 100 : ((pool_ - rank) / (pool_ - 1)) * 100;

  return {
    position,
    pool: pool_,
    rank,
    percentile: round(percentile),
    median: round(medianPoints(ranked)),
    ...(options.replacementRank && {
      replacement: replacementLevel(
        ranked,
        options.replacementRank,
        player.fantasyPoints,
      ),
    }),
  };
};

const medianPoints = (ranked: readonly ScoredStatLine[]) => {
  if (ranked.length === 0) return 0;
  const middle = Math.floor(ranked.length / 2);
  return ranked.length % 2 === 0
    ? (ranked[middle - 1].fantasyPoints + ranked[middle].fantasyPoints) / 2
    : ranked[middle].fantasyPoints;
};

/**
 * What the last startable player at this position scored, and how far above it
 * this one is. A shallow position makes an ordinary player valuable; this is
 * the number that says so.
 */
const replacementLevel = (
  ranked: readonly ScoredStatLine[],
  rank: number,
  fantasyPoints: number,
): ReplacementLevel => {
  // A baseline past the end of the pool is the worst player in it: asking for
  // the 36th receiver in a group of 30 should not divide by nothing.
  const baseline = ranked[Math.min(rank, ranked.length) - 1];
  const points = baseline?.fantasyPoints ?? 0;
  return {
    rank,
    fantasyPoints: round(points),
    valueOver: round(fantasyPoints - points),
  };
};
