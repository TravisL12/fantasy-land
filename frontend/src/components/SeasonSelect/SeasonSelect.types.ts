import type { SportCatalog } from '@/api/sports';

export interface SeasonSelectProps {
  catalog: SportCatalog;
  /** Undefined means the sport's default season. */
  value: string | undefined;
  onChange: (season: string) => void;
}
