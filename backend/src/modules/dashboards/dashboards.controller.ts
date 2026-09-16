import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Req,
  Res,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { openSseStream, writeSseEvent } from '../../common/http/sse.js';
import { CHAT_MESSAGES, CHAT_ROLES } from '../chat/chat.constants.js';
import type { PublicUser } from '../users/users.types.js';
import { DashboardBuilderService } from './dashboard-builder.service.js';
import { DASHBOARDS_ROUTE, DASHBOARDS_ROUTES } from './dashboards.constants.js';
import { DashboardsService } from './dashboards.service.js';
import type { DashboardRun, PublicDashboard } from './dashboards.types.js';
import { BuildRequestDto } from './dto/build-request.dto.js';
import { DashboardSpecDto } from './dto/dashboard-spec.dto.js';

@Controller(DASHBOARDS_ROUTE)
export class DashboardsController {
  constructor(
    private readonly dashboards: DashboardsService,
    private readonly builder: DashboardBuilderService,
  ) {}

  @Get()
  async list(@CurrentUser() user: PublicUser): Promise<PublicDashboard[]> {
    const saved = await this.dashboards.list(user.id);
    return saved.map((dashboard) => this.dashboards.toPublic(dashboard));
  }

  /** Runs a spec that has not been saved — the builder's live preview. */
  @Post(DASHBOARDS_ROUTES.run)
  @HttpCode(HttpStatus.OK)
  run(@Body() { spec }: DashboardSpecDto): Promise<DashboardRun> {
    return this.dashboards.run(this.dashboards.validate(spec));
  }

  @Post(DASHBOARDS_ROUTES.build)
  async build(
    @Body() { messages }: BuildRequestDto,
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<void> {
    if (messages.at(-1)?.role !== CHAT_ROLES.user) {
      throw new BadRequestException(CHAT_MESSAGES.lastMustBeUser);
    }

    const controller = new AbortController();
    req.on('close', () => controller.abort());
    openSseStream(res);

    for await (const event of this.builder.build(messages, controller.signal)) {
      if (controller.signal.aborted) break;
      writeSseEvent(res, event);
    }
    res.end();
  }

  @Post()
  async create(
    @CurrentUser() user: PublicUser,
    @Body() { spec }: DashboardSpecDto,
  ): Promise<PublicDashboard> {
    const created = await this.dashboards.create(
      user.id,
      this.dashboards.validate(spec),
    );
    return this.dashboards.toPublic(created);
  }

  @Get(DASHBOARDS_ROUTES.byId)
  async get(
    @CurrentUser() user: PublicUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<PublicDashboard> {
    return this.dashboards.toPublic(await this.dashboards.get(user.id, id));
  }

  @Patch(DASHBOARDS_ROUTES.byId)
  async update(
    @CurrentUser() user: PublicUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() { spec }: DashboardSpecDto,
  ): Promise<PublicDashboard> {
    const updated = await this.dashboards.update(
      user.id,
      id,
      this.dashboards.validate(spec),
    );
    return this.dashboards.toPublic(updated);
  }

  @Delete(DASHBOARDS_ROUTES.byId)
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @CurrentUser() user: PublicUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    return this.dashboards.remove(user.id, id);
  }
}
