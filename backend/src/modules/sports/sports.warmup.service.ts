import {
  Inject,
  Injectable,
  Logger,
  type OnApplicationBootstrap,
  type OnApplicationShutdown,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SPORTS_CONFIG_KEY, SPORTS_WARMUP_MODES } from '../../config/config.constants.js';
import type { SportsConfig } from '../../config/sports.config.js';
import { DATA_KINDS, SPORT_PROVIDERS } from './sports.constants.js';
import type { SportProvider } from './sports.types.js';
import { providesPlayerDirectory } from './sports.utils.js';

/**
 * Pulls finished seasons into the cache at startup, so the first question
 * about 2019 is answered from Postgres rather than from eighteen weekly
 * requests to an upstream API.
 *
 * This is worth doing only because a finished season never expires: the work
 * is paid once for the life of a cache, not once per restart. Everything here
 * goes through the providers' normal cached paths, so a season already held is
 * a single Postgres read and the warm-up costs nothing for it.
 *
 * It is strictly background work. Nobody is waiting on it, it never throws,
 * and it stops on shutdown rather than holding the process open.
 */
@Injectable()
export class SportsWarmupService
  implements OnApplicationBootstrap, OnApplicationShutdown
{
  private readonly logger = new Logger(SportsWarmupService.name);
  private stopped = false;
  /** Exposed so a test can await the run instead of racing it. */
  warming?: Promise<void>;

  constructor(
    @Inject(SPORT_PROVIDERS) private readonly providers: SportProvider[],
    private readonly config: ConfigService,
  ) {}

  onApplicationBootstrap(): void {
    if (this.settings.warmup === SPORTS_WARMUP_MODES.off) return;
    this.warming = this.warm().catch((error: unknown) => {
      this.logger.warn(`Season warm-up stopped: ${String(error)}`);
    });
  }

  onApplicationShutdown(): void {
    this.stopped = true;
  }

  private get settings(): SportsConfig {
    return this.config.getOrThrow<SportsConfig>(SPORTS_CONFIG_KEY);
  }

  private async warm(): Promise<void> {
    const { warmupSeasons, warmupDelayMs } = this.settings;
    const started = Date.now();
    let warmed = 0;
    let failed = 0;

    for (const provider of this.providers) {
      if (this.stopped) break;

      const catalog = await provider.getCatalog().catch(() => null);
      if (!catalog) continue;

      // The player directory is one payload for every season at once, so it is
      // warmed here rather than once per season.
      if (providesPlayerDirectory(provider)) {
        await provider.getPlayerDirectory().catch(() => undefined);
      }

      // Catalogs list seasons newest first, which is also the order they are
      // most likely to be asked about.
      const seasons = catalog.seasons.slice(0, warmupSeasons);
      for (const season of seasons) {
        for (const group of catalog.groups) {
          if (this.stopped) return this.report(started, warmed, failed);

          try {
            await provider.getStatLines({
              season,
              group: group.key,
              kind: DATA_KINDS.stats,
            });
            warmed += 1;
          } catch (error) {
            failed += 1;
            this.logger.debug(
              `Warm-up missed ${provider.key} ${season} ${group.key}: ${(error as Error).message}`,
            );
          }

          await this.pause(warmupDelayMs);
        }
      }
    }

    this.report(started, warmed, failed);
  }

  private report(started: number, warmed: number, failed: number) {
    const seconds = Math.round((Date.now() - started) / 1000);
    const missed = failed ? `, ${failed} unavailable` : '';
    this.logger.log(
      `Warmed ${warmed} season/group combination${warmed === 1 ? '' : 's'} in ${seconds}s${missed}`,
    );
  }

  private pause(ms: number) {
    return new Promise<void>((resolve) => {
      const timer = setTimeout(resolve, ms);
      // Never the reason the process stays alive.
      timer.unref?.();
    });
  }
}
