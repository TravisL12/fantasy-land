import type { HEALTH_STATUS_OK } from './health.constants.js';

export interface HealthStatus {
  status: typeof HEALTH_STATUS_OK;
  uptime: number;
  timestamp: string;
}
