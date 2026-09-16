import { Module } from '@nestjs/common';
import { ChatModule } from '../chat/chat.module.js';
import { ToolsModule } from '../tools/tools.module.js';
import { DashboardBuilderService } from './dashboard-builder.service.js';
import { DashboardsController } from './dashboards.controller.js';
import { DashboardsService } from './dashboards.service.js';

@Module({
  imports: [ChatModule, ToolsModule],
  controllers: [DashboardsController],
  providers: [DashboardsService, DashboardBuilderService],
})
export class DashboardsModule {}
