/**
 * An e2e run boots the real AppModule, which would otherwise start pulling ten
 * seasons of stats from live upstream APIs the moment the app initialises.
 * Tests exercise the routes, not the cache.
 */
process.env.SPORTS_WARMUP = 'off';
