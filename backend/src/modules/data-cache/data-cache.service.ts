import { Inject, Injectable, Logger } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DRIZZLE } from '../../database/database.constants.js';
import type { Database } from '../../database/database.types.js';
import { DATA_CACHE_MEMORY_ENTRIES } from './data-cache.constants.js';
import { dataCache } from './data-cache.schema.js';

interface MemoryEntry {
  value: unknown;
  expiresAt: number;
}

/**
 * Read-through cache for expensive upstream loads: memory → Postgres → loader.
 * Concurrent requests for the same key share one load, and a failed refresh
 * falls back to the last stored value so an API outage doesn't take the page down.
 */
@Injectable()
export class DataCacheService {
  private readonly logger = new Logger(DataCacheService.name);
  private readonly memory = new Map<string, MemoryEntry>();
  private readonly inFlight = new Map<string, Promise<unknown>>();

  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  async wrap<T>(
    key: string,
    ttlMs: number,
    loader: () => Promise<T>,
  ): Promise<T> {
    const cached = this.memory.get(key);
    if (cached && cached.expiresAt > Date.now()) return cached.value as T;

    const pending = this.inFlight.get(key);
    if (pending) return pending as Promise<T>;

    const load = this.load(key, ttlMs, loader).finally(() =>
      this.inFlight.delete(key),
    );
    this.inFlight.set(key, load);
    return load;
  }

  private async load<T>(
    key: string,
    ttlMs: number,
    loader: () => Promise<T>,
  ): Promise<T> {
    const [row] = await this.db
      .select()
      .from(dataCache)
      .where(eq(dataCache.key, key));
    if (row && row.expiresAt.getTime() > Date.now()) {
      this.remember(key, row.payload, row.expiresAt.getTime());
      return row.payload as T;
    }

    try {
      const payload = await loader();
      // "Not found" results aren't worth persisting.
      if (payload === null || payload === undefined) return payload;
      const expiresAt = new Date(Date.now() + ttlMs);
      await this.db
        .insert(dataCache)
        .values({ key, payload, expiresAt })
        .onConflictDoUpdate({
          target: dataCache.key,
          set: { payload, expiresAt, fetchedAt: new Date() },
        });
      this.remember(key, payload, expiresAt.getTime());
      return payload;
    } catch (error) {
      if (!row) throw error;
      this.logger.warn(
        `Serving stale data for ${key}: ${(error as Error).message}`,
      );
      return row.payload as T;
    }
  }

  private remember(key: string, value: unknown, expiresAt: number) {
    this.memory.delete(key);
    this.memory.set(key, { value, expiresAt });
    if (this.memory.size > DATA_CACHE_MEMORY_ENTRIES) {
      const oldest = this.memory.keys().next().value;
      if (oldest !== undefined) this.memory.delete(oldest);
    }
  }
}
