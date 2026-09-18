import type { ConfigService } from '@nestjs/config';
import type { SportsConfig } from '../../config/sports.config.js';
import type { SportCatalog, SportProvider } from './sports.types.js';
import { SportsWarmupService } from './sports.warmup.service.js';

const catalog = (seasons: string[], groups: string[]) =>
  ({
    seasons,
    groups: groups.map((key) => ({ key })),
  }) as unknown as SportCatalog;

const providerStub = (
  key: string,
  seasons: string[],
  groups: string[],
  extra: Partial<SportProvider> = {},
) =>
  ({
    key,
    getCatalog: vi.fn().mockResolvedValue(catalog(seasons, groups)),
    getStatLines: vi.fn().mockResolvedValue([]),
    getGameLog: vi.fn(),
    ...extra,
  }) as unknown as SportProvider;

const configStub = (overrides: Partial<SportsConfig> = {}) =>
  ({
    getOrThrow: () => ({
      warmup: 'boot',
      warmupSeasons: 10,
      warmupDelayMs: 0,
      ...overrides,
    }),
  }) as unknown as ConfigService;

const seasons = (count: number) =>
  Array.from({ length: count }, (_, i) => String(2026 - i));

describe('SportsWarmupService', () => {
  it('warms every season and group the catalog offers, newest first', async () => {
    const provider = providerStub('nfl', seasons(3), ['offense', 'kicking']);
    const service = new SportsWarmupService([provider], configStub());

    service.onApplicationBootstrap();
    await service.warming;

    expect(provider.getStatLines).toHaveBeenCalledTimes(6);
    expect(vi.mocked(provider.getStatLines).mock.calls[0][0]).toMatchObject({
      season: '2026',
      group: 'offense',
      kind: 'stats',
    });
  });

  it('stops at the configured number of seasons', async () => {
    const provider = providerStub('nfl', seasons(20), ['offense']);
    const service = new SportsWarmupService(
      [provider],
      configStub({ warmupSeasons: 10 }),
    );

    service.onApplicationBootstrap();
    await service.warming;

    expect(provider.getStatLines).toHaveBeenCalledTimes(10);
  });

  it('asks a provider that has one for its player directory, once', async () => {
    const getPlayerDirectory = vi.fn().mockResolvedValue([]);
    const provider = providerStub('nfl', seasons(3), ['offense'], {
      getPlayerDirectory,
    } as Partial<SportProvider>);
    const service = new SportsWarmupService([provider], configStub());

    service.onApplicationBootstrap();
    await service.warming;

    expect(getPlayerDirectory).toHaveBeenCalledTimes(1);
  });

  it('does nothing when warm-up is off', async () => {
    const provider = providerStub('nfl', seasons(3), ['offense']);
    const service = new SportsWarmupService(
      [provider],
      configStub({ warmup: 'off' }),
    );

    service.onApplicationBootstrap();
    await service.warming;

    expect(provider.getStatLines).not.toHaveBeenCalled();
  });

  it('keeps going when one season fails, and warms the other sports', async () => {
    const nfl = providerStub('nfl', seasons(2), ['offense']);
    vi.mocked(nfl.getStatLines).mockRejectedValueOnce(new Error('502'));
    const mlb = providerStub('mlb', seasons(2), ['hitting']);
    const service = new SportsWarmupService([nfl, mlb], configStub());

    service.onApplicationBootstrap();
    await service.warming;

    expect(nfl.getStatLines).toHaveBeenCalledTimes(2);
    expect(mlb.getStatLines).toHaveBeenCalledTimes(2);
  });

  it('skips a sport whose catalog cannot be read rather than failing', async () => {
    const broken = providerStub('nfl', seasons(2), ['offense']);
    vi.mocked(broken.getCatalog).mockRejectedValue(new Error('offline'));
    const mlb = providerStub('mlb', seasons(2), ['hitting']);
    const service = new SportsWarmupService([broken, mlb], configStub());

    service.onApplicationBootstrap();
    await expect(service.warming).resolves.toBeUndefined();

    expect(broken.getStatLines).not.toHaveBeenCalled();
    expect(mlb.getStatLines).toHaveBeenCalledTimes(2);
  });

  it('stops partway through on shutdown', async () => {
    const provider = providerStub('nfl', seasons(10), ['offense']);
    vi.mocked(provider.getStatLines).mockImplementation(async () => {
      service.onApplicationShutdown();
      return [];
    });
    const service = new SportsWarmupService([provider], configStub());

    service.onApplicationBootstrap();
    await service.warming;

    expect(provider.getStatLines).toHaveBeenCalledTimes(1);
  });
});
