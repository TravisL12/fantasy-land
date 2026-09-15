export const DATA_CACHE_MEMORY_ENTRIES = 30;

const MINUTE = 60_000;
export const CACHE_TTL = {
  live: 15 * MINUTE,
  hourly: 60 * MINUTE,
  daily: 24 * 60 * MINUTE,
  archived: 7 * 24 * 60 * MINUTE,
} as const;
