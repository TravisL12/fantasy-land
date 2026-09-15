import type { HealthStatus } from '../health.types.js';

export class HealthResponseDto implements HealthStatus {
  status!: HealthStatus['status'];
  uptime!: number;
  timestamp!: string;
}
