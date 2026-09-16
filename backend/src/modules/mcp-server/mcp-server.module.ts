import { Module } from '@nestjs/common';
import { ToolsModule } from '../tools/tools.module.js';
import { McpServerController } from './mcp-server.controller.js';
import { McpServerService } from './mcp-server.service.js';

@Module({
  imports: [ToolsModule],
  controllers: [McpServerController],
  providers: [McpServerService],
})
export class McpServerModule {}
