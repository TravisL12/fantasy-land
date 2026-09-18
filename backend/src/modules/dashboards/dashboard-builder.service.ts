import { Injectable } from '@nestjs/common';
import { CHAT_EVENTS, CHAT_ROLES } from '../chat/chat.constants.js';
import { ChatService } from '../chat/chat.service.js';
import type { ChatMessage, ChatStreamEvent } from '../chat/chat.types.js';
import { BuildDashboardTool } from './build-dashboard.tool.js';
import {
  BUILDER_MAX_TOOL_ROUNDS,
  BUILDER_SYSTEM_PROMPT,
  BUILD_NUDGE,
  DASHBOARD_EVENTS,
  DASHBOARD_MESSAGES,
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
    const tool = new BuildDashboardTool(
      this.dashboards.knownTools(),
      (built) => {
        spec = built;
      },
      (candidate) => this.dashboards.run(candidate),
    );

    const systemPrompt = current
      ? BUILDER_SYSTEM_PROMPT + editPreamble(current)
      : BUILDER_SYSTEM_PROMPT;

    const pass = async function* (
      this: DashboardBuilderService,
      messages: ChatMessage[],
    ): AsyncGenerator<DashboardStreamEvent, boolean> {
      let built = false;
      for await (const event of this.chat.run(messages, signal, {
        systemPrompt,
        extraTools: [tool],
        maxToolRounds: BUILDER_MAX_TOOL_ROUNDS,
      })) {
        // The spec goes out as soon as the tool accepts it, so the preview
        // appears while the model is still writing its closing sentence.
        if (spec) {
          yield { type: DASHBOARD_EVENTS.spec, spec };
          spec = undefined;
          built = true;
        }
        yield event as ChatStreamEvent;
      }

      if (spec) {
        yield { type: DASHBOARD_EVENTS.spec, spec };
        spec = undefined;
        built = true;
      }
      return built;
    }.bind(this);

    if (yield* pass(history)) return;
    if (signal.aborted) return;

    /*
     * A small model regularly answers the question in prose and never calls
     * build_dashboard, having already fetched everything it needed. One nudge
     * converts that into the dashboard the person asked for; the tool results
     * it repeats come from the data cache, so the second pass is cheap.
     */
    const nudged = yield* pass([
      ...history,
      { role: CHAT_ROLES.user, content: BUILD_NUDGE },
    ]);

    // A turn that ends with no dashboard has to say so. Otherwise the model's
    // closing sentence claims one was built and the panel just stays empty.
    if (!nudged && !signal.aborted) {
      yield { type: CHAT_EVENTS.error, message: DASHBOARD_MESSAGES.noSpec };
    }
  }
}
