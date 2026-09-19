import { STARTER_COPY } from './StarterCell.constants';
import { Rating, Starter } from './StarterCell.styles';
import type { StarterCellProps } from './StarterCell.types';

/** An announced starter, carrying how tough the opponent rates. */
export const StarterCell = ({ starter }: StarterCellProps) => {
  if (!starter) return STARTER_COPY.none;

  return (
    <Starter>
      <span>{starter.name}</span>
      {starter.matchup && (
        <Rating>
          {STARTER_COPY.matchup(
            starter.opponent,
            starter.matchup.grade,
            starter.matchup.score,
          )}
        </Rating>
      )}
    </Starter>
  );
};
