import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { configureApp } from './app.setup.js';
import type { AppConfig } from './config/app.config.js';
import { APP_CONFIG_KEY } from './config/config.constants.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const { port, corsOrigin } = app
    .get(ConfigService)
    .getOrThrow<AppConfig>(APP_CONFIG_KEY);

  configureApp(app);
  app.enableCors({ origin: corsOrigin, credentials: true });

  await app.listen(port);
}
await bootstrap();
