import { Injectable } from '@nestjs/common';
import { ChatService } from '../chat/chat.service.js';
import type { ChatMessage } from '../chat/chat.types.js';
import { BuildDashboardTool } from './build-dashboard.tool.js';
import {
  BUILDER_SYSTEM_PROMPT,
  DASHBOARD_EVENTS,
  editPreamble,
} from './dashboards.constants.js';
import { DashboardsService } from './dashboards.service.js';
import type { DashboardSpec, DashboardStreamEvent } from './dashboards.types.js';

/**
 * The same assistant→tool loop the chat uses, pointed at a different job: the
 * model explores the data tools as usual, but finishes by calling
 * build_dashboard, whose arguments become the spec the client renders.
 */
@Injectable()
export class DashboardBuilderService {
  constructor(
    private readonly chat: ChatService,
    private readonly dashboards: DashboardsService,
  ) {}

  async *build(
    history: ChatMessage[],
    signal: AbortSignal,
    current?: DashboardSpec,
  ): AsyncGenerator<DashboardStreamEvent> {
    // The tool is request-scoped so it can capture this build's spec.
    let spec: DashboardSpec | undefined;
    const tool = new BuildDashboardTool(this.dashboards.knownTools(), (built) => {
      spec = built;
    });

    const systemPrompt = current
      ? BUILDER_SYSTEM_PROMPT + editPreamble(current)
      : BUILDER_SYSTEM_PROMPT;

    for await (const event of this.chat.run(history, signal, {
      systemPrompt,
      extraTools: [tool],
    })) {
      // The spec goes out as soon as the tool accepts it, so the preview
      // appears while the model is still writing its closing sentence.
      if (spec) {
        yield { type: DASHBOARD_EVENTS.spec, spec };
        spec = undefined;
      }
      yield event;
    }

    if (spec) yield { type: DASHBOARD_EVENTS.spec, spec };
  }
}
