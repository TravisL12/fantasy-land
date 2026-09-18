import type { SportCatalog } from '@/api/sports';

/** What every sport view reads from its parent route. */
export interface SportOutletContext {
  catalog: SportCatalog;
}
