import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { appConfig } from './config/app.config.js';
import { authConfig } from './config/auth.config.js';
import { chatConfig } from './config/chat.config.js';
import { databaseConfig } from './config/database.config.js';
import { mcpHttpConfig } from './config/mcp-http.config.js';
import { mcpConfig } from './config/mcp.config.js';
import { DatabaseModule } from './database/database.module.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { ChatModule } from './modules/chat/chat.module.js';
import { DashboardsModule } from './modules/dashboards/dashboards.module.js';
import { HealthModule } from './modules/health/health.module.js';
import { McpServerModule } from './modules/mcp-server/mcp-server.module.js';
import { SportsModule } from './modules/sports/sports.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [
        appConfig,
        databaseConfig,
        authConfig,
        chatConfig,
        mcpConfig,
        mcpHttpConfig,
      ],
    }),
    DatabaseModule,
    AuthModule,
    ChatModule,
    DashboardsModule,
    HealthModule,
    McpServerModule,
    SportsModule,
  ],
})
export class AppModule {}
