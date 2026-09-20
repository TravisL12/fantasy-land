import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    globals: true,
    root: './',
    include: ['**/*.eval-spec.ts'],
    setupFiles: ['./eval/setup-eval.ts'],
    // One model, one GPU: cases run one at a time or they queue behind each
    // other anyway and the per-case timings stop meaning anything.
    fileParallelism: false,
    maxConcurrency: 1,
    // A failing case is a measurement, not a reason to stop measuring.
    bail: 0,
  },
});
