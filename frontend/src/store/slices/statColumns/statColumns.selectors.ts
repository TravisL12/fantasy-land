import type { RootState } from '@/store';

export const statColumnsScope = (sport: string, group: string) =>
  `${sport}:${group}`;

export const selectStatColumns = (state: RootState, scope: string) =>
  state.statColumns.selected[scope];
