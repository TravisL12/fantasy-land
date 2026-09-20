import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { EVAL_SETTINGS } from './eval.constants.js';
import type { EvalResult } from './eval.types.js';

const pct = (part: number, whole: number) =>
  whole === 0 ? '—' : `${Math.round((part / whole) * 100)}%`;

const median = (values: number[]) => {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
};

const mean = (values: number[]) =>
  values.length === 0
    ? 0
    : values.reduce((total, value) => total + value, 0) / values.length;

const round = (value: number, places = 1) => Number(value.toFixed(places));

/** Pass rate per tag, so "window" or "multi-season" can be read on its own. */
const byTag = (results: EvalResult[]) => {
  const tags = new Map<string, { total: number; passed: number }>();
  for (const result of results) {
    for (const tag of result.case.tags ?? []) {
      const entry = tags.get(tag) ?? { total: 0, passed: 0 };
      entry.total += 1;
      if (result.passed) entry.passed += 1;
      tags.set(tag, entry);
    }
  }
  return [...tags.entries()].sort(([a], [b]) => a.localeCompare(b));
};

/**
 * Tools called on cases that failed. The interesting number is not that a case
 * failed but what the model reached for instead — a tool that keeps showing up
 * here is one whose description is competing with its neighbour's.
 */
const wrongTurns = (results: EvalResult[]) => {
  const tally = new Map<string, number>();
  for (const result of results.filter(({ passed }) => !passed)) {
    for (const { name } of result.run.calls) {
      tally.set(name, (tally.get(name) ?? 0) + 1);
    }
  }
  return [...tally.entries()].sort(([, a], [, b]) => b - a).slice(0, 5);
};

export const summarize = (results: EvalResult[]) => {
  const runs = results.map(({ run }) => run);
  const allCalls = runs.flatMap(({ calls }) => calls);
  return {
    model: process.env.OLLAMA_MODEL ?? '(compose default)',
    cases: results.length,
    passed: results.filter(({ passed }) => passed).length,
    timedOut: runs.filter(({ timedOut }) => timedOut).length,
    errored: runs.filter(({ error }) => Boolean(error)).length,
    toolRounds: {
      mean: round(mean(runs.map(({ toolRounds }) => toolRounds))),
      median: median(runs.map(({ toolRounds }) => toolRounds)),
      max: Math.max(0, ...runs.map(({ toolRounds }) => toolRounds)),
    },
    seconds: {
      mean: round(mean(runs.map(({ durationMs }) => durationMs)) / 1000),
      median: round(median(runs.map(({ durationMs }) => durationMs)) / 1000),
      total: round(
        runs.reduce((total, { durationMs }) => total + durationMs, 0) / 1000,
      ),
    },
    calls: {
      total: allCalls.length,
      /** Calls the tool rejected — the model sending arguments it cannot parse. */
      errored: allCalls.filter(({ isError }) => isError).length,
    },
  };
};

export const printReport = (results: EvalResult[]): void => {
  if (results.length === 0) return;

  const s = summarize(results);
  const lines = [
    '',
    '─'.repeat(64),
    `Tool-selection eval — ${s.model}`,
    '─'.repeat(64),
    `  passed        ${s.passed}/${s.cases}  (${pct(s.passed, s.cases)})`,
    `  tool rounds   mean ${s.toolRounds.mean}, median ${s.toolRounds.median}, max ${s.toolRounds.max}`,
    `  seconds/case  mean ${s.seconds.mean}, median ${s.seconds.median}  (${s.seconds.total}s total)`,
    `  tool calls    ${s.calls.total}, of which ${s.calls.errored} came back an error (${pct(
      s.calls.errored,
      s.calls.total,
    )})`,
  ];

  if (s.timedOut > 0) lines.push(`  timed out     ${s.timedOut}`);
  if (s.errored > 0) lines.push(`  loop errors   ${s.errored}`);

  const tags = byTag(results);
  if (tags.length > 0) {
    lines.push('', '  by tag');
    for (const [tag, { total, passed }] of tags) {
      lines.push(`    ${tag.padEnd(16)} ${passed}/${total}  (${pct(passed, total)})`);
    }
  }

  const wrong = wrongTurns(results);
  if (wrong.length > 0) {
    lines.push('', '  tools called on failing cases');
    for (const [name, count] of wrong) {
      lines.push(`    ${name.padEnd(24)} ${count}`);
    }
  }

  const failed = results.filter(({ passed }) => !passed);
  if (failed.length > 0) {
    lines.push('', '  failures');
    for (const result of failed) {
      lines.push(`    ${result.case.id}: ${result.case.question}`);
      for (const failure of result.failures) lines.push(`      ${failure}`);
      if (result.case.why) lines.push(`      why it matters: ${result.case.why}`);
    }
  }

  lines.push('─'.repeat(64), '');
  // Straight to stdout: the runner captures console output per test, and this
  // summary belongs to the run rather than to whichever case finished last.
  process.stdout.write(`${lines.join('\n')}\n`);

  writeReport(results, s);
};

/** A run is only comparable with another one if it was written down. */
const writeReport = (
  results: EvalResult[],
  summary: ReturnType<typeof summarize>,
): void => {
  const path = EVAL_SETTINGS.reportPath;
  if (!path) return;

  const payload = {
    ranAt: new Date().toISOString(),
    summary,
    results: results.map(({ case: testCase, run, passed, failures }) => ({
      id: testCase.id,
      question: testCase.question,
      tags: testCase.tags ?? [],
      passed,
      failures,
      toolRounds: run.toolRounds,
      durationMs: run.durationMs,
      timedOut: run.timedOut,
      calls: run.calls,
      answer: run.answer,
    })),
  };

  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(payload, null, 2)}\n`);
  process.stdout.write(`Wrote ${path}\n`);
};
