const number = (value: string | undefined, fallback: number) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

export const EVAL_SETTINGS = {
  /**
   * A 27b answering a question that needs three tool rounds is minutes, not
   * seconds, and a case that trips this is reported as a timeout rather than
   * failing the whole file.
   */
  caseTimeoutMs: number(process.env.EVAL_CASE_TIMEOUT_MS, 240_000),
  /** Where a machine-readable run is written, for comparing two models. */
  reportPath: process.env.EVAL_REPORT_PATH,
  /** Run only cases carrying this tag, e.g. EVAL_TAG=window. */
  tag: process.env.EVAL_TAG,
} as const;

/** Vitest needs headroom over the per-case budget to report the timeout itself. */
export const EVAL_TEST_TIMEOUT_MS = EVAL_SETTINGS.caseTimeoutMs + 30_000;
