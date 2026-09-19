import { CLINCH_STATUS } from '../sports.constants.js';
import type { ClinchStatus, StandingsEntry } from '../sports.types.js';

/** A tie is half a win to both sides, which is how a league with draws ranks. */
const effectiveWins = ({ wins, ties }: Pick<StandingsEntry, 'wins' | 'ties'>) =>
  wins + ties / 2;

const effectiveLosses = ({
  losses,
  ties,
}: Pick<StandingsEntry, 'losses' | 'ties'>) => losses + ties / 2;

/**
 * What one club still needs to finish ahead of another: every win of its own
 * and every loss of the rival's counts once, so the number falls by one on
 * either. It is the classic magic number, and reaching zero means the rival
 * can no longer catch them **on wins** — which is all a magic number has ever
 * claimed, tiebreakers aside.
 *
 * The rival's most wins they can still finish on is `gamesInSeason` minus the
 * games they have already lost, which is why no games-remaining count is
 * needed: the season length carries it.
 */
export const magicNumberOver = (
  team: StandingsEntry,
  rival: StandingsEntry,
  gamesInSeason: number,
): number =>
  Math.max(
    0,
    Math.ceil(gamesInSeason + 1 - effectiveWins(team) - effectiveLosses(rival)),
  );

/**
 * Every club's position in its own group. A group is one spot, so a club's
 * magic number is measured against its nearest rival and its elimination
 * number is that same figure seen from the other side — being eliminated from
 * a group is exactly the leader having clinched it.
 *
 * Clinch status is only asserted where the arithmetic settles it. A club that
 * merely leads is `contending`, because a lead is not a place.
 */
export const clinchNumbers = (
  teams: StandingsEntry[],
  gamesInSeason: number,
): StandingsEntry[] => {
  if (teams.length < 2) return teams;

  return teams.map((team) => {
    const rivals = teams.filter(({ team: other }) => other !== team.team);

    // The hardest rival to shake sets the magic number, and the club best
    // placed to shake this one sets its elimination number.
    // Winning the group means shaking every rival, so the hardest one sets the
    // magic number; being put out of it takes only one, so the best-placed
    // rival sets the elimination number.
    const magic = Math.max(
      ...rivals.map((rival) => magicNumberOver(team, rival, gamesInSeason)),
    );
    const elimination = Math.min(
      ...rivals.map((rival) => magicNumberOver(rival, team, gamesInSeason)),
    );

    return {
      ...team,
      magicNumber: team.magicNumber ?? magic,
      eliminationNumber: team.eliminationNumber ?? elimination,
      clinch:
        team.clinch === CLINCH_STATUS.contending
          ? statusFor(magic, elimination)
          : team.clinch,
    };
  });
};

/**
 * Zero either way settles it. Anything above zero is still a race, however
 * short — a club one win from the division has not won it.
 */
const statusFor = (magic: number, elimination: number): ClinchStatus => {
  if (magic === 0) return CLINCH_STATUS.clinched;
  if (elimination === 0) return CLINCH_STATUS.eliminated;
  return CLINCH_STATUS.contending;
};
