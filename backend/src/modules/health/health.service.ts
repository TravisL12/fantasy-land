import { Injectable } from '@nestjs/common';
import type { HealthResponseDto } from './dto/health-response.dto.js';
import { HEALTH_STATUS_OK } from './health.constants.js';

@Injectable()
export class HealthService {
  check(): HealthResponseDto {
    return {
      status: HEALTH_STATUS_OK,
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    };
  }
}
