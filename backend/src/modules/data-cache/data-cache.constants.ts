export const DATA_CACHE_MEMORY_ENTRIES = 30;

const MINUTE = 60_000;
export const CACHE_TTL = {
  live: 15 * MINUTE,
  hourly: 60 * MINUTE,
  daily: 24 * 60 * MINUTE,
  /**
   * A finished season. Its stats cannot change, so the only reason to refetch
   * is a change on our side — a mapper, a stat definition, a scoring rule —
   * and SPORTS_CACHE_VERSION already invalidates every key when that happens.
   * A week-long TTL was re-pulling eighteen weekly payloads per stat group to
   * rebuild a number that was never going to differ.
   */
  archived: 10 * 365 * 24 * 60 * MINUTE,
} as const;
