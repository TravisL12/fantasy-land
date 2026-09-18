import type { SportCatalog } from '@/api/sports';

export interface SportTab {
  /** Path segment under /sports/:sport; undefined is the index view. */
  segment?: string;
  label: string;
  /** Which provider capability this view needs, if any. */
  requires?: keyof SportCatalog['capabilities'];
}

export interface SportTabsProps {
  catalog: SportCatalog;
}
