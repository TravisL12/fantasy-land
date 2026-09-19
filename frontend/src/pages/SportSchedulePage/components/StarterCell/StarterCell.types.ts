import type { ProbableStarter } from '@/api/sports';

export interface StarterCellProps {
  /** Null until the league announces one, which baseball does ~4 days out. */
  starter: ProbableStarter | null;
}
