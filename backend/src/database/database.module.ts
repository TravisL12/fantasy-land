import {
  Global,
  Inject,
  Module,
  type OnApplicationShutdown,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import type { DatabaseConfig } from '../config/database.config.js';
import { DATABASE_CONFIG_KEY } from '../config/config.constants.js';
import { DRIZZLE, PG_POOL } from './database.constants.js';
import { runMigrations } from './database.migrate.js';
import * as schema from './schema.js';

@Global()
@Module({
  providers: [
    {
      provide: PG_POOL,
      inject: [ConfigService],
      useFactory: (config: ConfigService) =>
        new Pool({
          connectionString:
            config.getOrThrow<DatabaseConfig>(DATABASE_CONFIG_KEY).url,
        }),
    },
    {
      provide: DRIZZLE,
      inject: [PG_POOL],
      useFactory: async (pool: Pool) => {
        await runMigrations(pool);
        return drizzle(pool, { schema, casing: 'snake_case' });
      },
    },
  ],
  exports: [DRIZZLE],
})
export class DatabaseModule implements OnApplicationShutdown {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  async onApplicationShutdown() {
    await this.pool.end();
  }
}
