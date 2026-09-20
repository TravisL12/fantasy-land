// The DTOs the service validates with are decorated, and nothing else in an
// eval run loads the shim that main.ts does.
import 'reflect-metadata';
import { fileURLToPath } from 'node:url';

/**
 * An eval run boots the real AppModule from the host rather than the container,
 * so it has to reproduce what docker compose would have injected, and settle
 * two things the app would otherwise decide for itself.
 */

// compose reads the repo-root .env; nothing does when the app runs from here,
// so the eval would silently measure the default model rather than the
// configured one. Existing variables win, so a one-off `OLLAMA_MODEL=... yarn
// be eval` still overrides the file.
try {
  process.loadEnvFile(fileURLToPath(new URL('../../.env', import.meta.url)));
} catch {
  // No root .env is fine — every setting has a default.
}

// The eval deliberately runs a smaller model than the app ships with. What
// these cases measure is tool selection — the descriptions, the argument
// coercion, the loose key matching — and that scaffolding is what steps on the
// roadmap change. A model that decodes four times faster turns a full pass from
// hours into minutes, which is the difference between a feedback loop and a
// report you run once. Measure the shipping model deliberately:
// `EVAL_MODEL=qwen3.5:27b-q4_K_M yarn be eval`.
process.env.OLLAMA_MODEL = process.env.EVAL_MODEL ?? 'qwen3.5:9b-q4_K_M';

// Greedy decoding, unlike the app's 0.3. Comparing two runs is the whole point
// of a report file, and at 0.3 a third of the cases that changed between runs
// changed for no reason at all — six real fixes arrived alongside four
// regressions that were pure sampling. An eval that cannot tell those apart
// cannot answer "did that help".
process.env.OLLAMA_TEMPERATURE ??= '0';

// The container reaches Ollama through host.docker.internal, which does not
// resolve out here. From the host it is a local port.
process.env.OLLAMA_BASE_URL ??= 'http://localhost:11434';

// Ten seasons of every sport and stat group, pulled at boot, would dominate the
// run and measure the warm-up rather than the model. Cases fetch what they need.
process.env.SPORTS_WARMUP ??= 'off';

// The model, on the other hand, we do want loaded before the first case, so the
// first question is not the only one paying for the weights and the prefill.
process.env.OLLAMA_WARMUP ??= 'boot';
