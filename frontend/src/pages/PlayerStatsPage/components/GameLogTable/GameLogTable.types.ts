import type {
  GameLogEntry,
  SportKey,
  StatGroup,
  StatValues,
} from '@/api/sports';

export interface GameLogTableProps {
  sport: SportKey;
  group: StatGroup;
  entries: GameLogEntry[];
  totals: StatValues;
  totalPoints: number;
  isFetching: boolean;
}
