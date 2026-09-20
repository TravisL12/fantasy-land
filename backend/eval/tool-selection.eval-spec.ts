import type { INestApplication } from '@nestjs/common';
import { ChatService } from '../src/modules/chat/chat.service.js';
import { EVAL_CASES } from './cases/index.js';
import { EVAL_SETTINGS, EVAL_TEST_TIMEOUT_MS } from './eval.constants.js';
import { checkExpectations } from './eval.match.js';
import { printReport } from './eval.report.js';
import { askOne, startEvalApp } from './eval.runner.js';
import type { EvalResult } from './eval.types.js';

/**
 * Does the agent reach for the right tool with the right arguments?
 *
 * Needs Postgres (`docker compose up -d db`) and Ollama with the configured
 * model pulled. Run it with `yarn be eval`; it is excluded from `yarn verify`
 * because it takes minutes and talks to live upstream APIs.
 *
 * The number to watch is not only the pass rate. Tool rounds per answer and the
 * share of calls that came back an error are what a model change or a new tool
 * argument actually moves, and both are in the summary.
 */
describe('Tool selection', () => {
  let app: INestApplication;
  let chat: ChatService;
  const results: EvalResult[] = [];

  const cases = EVAL_SETTINGS.tag
    ? EVAL_CASES.filter(({ tags }) => tags?.includes(EVAL_SETTINGS.tag as string))
    : EVAL_CASES;

  beforeAll(async () => {
    app = await startEvalApp();
    chat = app.get(ChatService);
    // Pay the weights and the prefill once, so the first case is not the only
    // one measuring a cold start.
    await chat.warmUp();
  }, EVAL_TEST_TIMEOUT_MS);

  afterAll(async () => {
    printReport(results);
    await app?.close();
  });

  it('has cases to run', () => {
    expect(cases.length).toBeGreaterThan(0);
  });

  for (const testCase of cases) {
    it(
      `${testCase.id}: ${testCase.question}`,
      async () => {
        const run = await askOne(chat, testCase.question);
        const failures = run.timedOut
          ? [`timed out after ${Math.round(run.durationMs / 1000)}s`]
          : checkExpectations(testCase.expect, testCase.forbid ?? [], run.calls);

        results.push({
          case: testCase,
          run,
          passed: failures.length === 0,
          failures,
        });

        expect(failures, failures.join('\n')).toEqual([]);
      },
      EVAL_TEST_TIMEOUT_MS,
    );
  }
});
