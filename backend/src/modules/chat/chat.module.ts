import { Module } from '@nestjs/common';
import { SportsModule } from '../sports/sports.module.js';
import { ToolsModule } from '../tools/tools.module.js';
import { ChatController } from './chat.controller.js';
import { ChatService } from './chat.service.js';
import { OllamaClient } from './ollama.client.js';

@Module({
  imports: [SportsModule, ToolsModule],
  controllers: [ChatController],
  providers: [ChatService, OllamaClient],
})
export class ChatModule {}
