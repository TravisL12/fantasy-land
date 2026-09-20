import { CAPABILITY_CASES } from './capabilities.cases.js';
import { MLB_CASES } from './mlb.cases.js';
import { NFL_CASES } from './nfl.cases.js';
import { ROUTING_CASES } from './routing.cases.js';
import type { EvalCase } from '../eval.types.js';

export const EVAL_CASES: EvalCase[] = [
  ...MLB_CASES,
  ...NFL_CASES,
  ...ROUTING_CASES,
  ...CAPABILITY_CASES,
];

export { CAPABILITY_CASES, MLB_CASES, NFL_CASES, ROUTING_CASES };
