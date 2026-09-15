import type { RootState } from './index';

const STORAGE_KEY = 'fantasy-land:prefs';

/** Slices worth keeping across reloads (UI preferences only — never server data). */
type PersistedState = Pick<RootState, 'statColumns'>;

export const loadPersistedState = (): Partial<RootState> | undefined => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as PersistedState) : undefined;
  } catch {
    return undefined;
  }
};

export const savePersistedState = (state: RootState) => {
  try {
    const persisted: PersistedState = { statColumns: state.statColumns };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(persisted));
  } catch {
    // Storage full or unavailable (private mode) — preferences just won't persist.
  }
};
