import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AppModule } from '../src/app.module.js';
import { CHAT_EVENTS, CHAT_ROLES } from '../src/modules/chat/chat.constants.js';
import { ChatService } from '../src/modules/chat/chat.service.js';
import { EVAL_SETTINGS } from './eval.constants.js';
import type { EvalRun, RecordedCall } from './eval.types.js';

/**
 * Boots the real app once for the whole eval. Everything the loop touches is
 * real — the providers, the Postgres cache, the MCP servers, the model — because
 * the failures worth catching (a stat key the model cannot spell, a tool that
 * rejects its arguments) only happen against real data.
 */
export const startEvalApp = async (): Promise<INestApplication> => {
  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const app = moduleRef.createNestApplication();
  await app.init();
  return app;
};

/**
 * Asks one question and records what the model did about it.
 *
 * Never throws: a case that times out or errors is a result with `timedOut` or
 * `error` set, so one bad question does not end the run and lose the other
 * thirty-nine measurements.
 */
export const askOne = async (
  chat: ChatService,
  question: string,
  timeoutMs = EVAL_SETTINGS.caseTimeoutMs,
): Promise<EvalRun> => {
  const calls: RecordedCall[] = [];
  const pending = new Map<string, RecordedCall>();
  const startedAt = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  let answer = '';
  let error: string | undefined;
  let toolRounds = 0;
  // A round is a batch of calls: the loop yields every tool_call of a turn,
  // then every tool_result. A call arriving after a result opens a new batch.
  let inBatch = false;

  try {
    const stream = chat.run(
      [{ role: CHAT_ROLES.user, content: question }],
      controller.signal,
    );

    for await (const event of stream) {
      switch (event.type) {
        case CHAT_EVENTS.token:
          answer += event.text;
          break;
        case CHAT_EVENTS.toolCall: {
          if (!inBatch) {
            toolRounds += 1;
            inBatch = true;
          }
          const call: RecordedCall = {
            name: event.call.name,
            arguments: event.call.arguments ?? {},
            isError: false,
          };
          pending.set(event.call.id, call);
          calls.push(call);
          break;
        }
        case CHAT_EVENTS.toolResult: {
          inBatch = false;
          const call = pending.get(event.id);
          if (call && event.isError) {
            call.isError = true;
            call.error = event.text;
          }
          break;
        }
        case CHAT_EVENTS.error:
          error = event.message;
          break;
        default:
          break;
      }
    }
  } catch (cause) {
    error = cause instanceof Error ? cause.message : String(cause);
  } finally {
    clearTimeout(timer);
  }

  return {
    calls,
    toolRounds,
    answer: answer.trim(),
    error,
    timedOut: controller.signal.aborted,
    durationMs: Date.now() - startedAt,
  };
};
