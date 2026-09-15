import { Controller, Get } from '@nestjs/common';
import { Public } from '../../common/decorators/public.decorator.js';
import type { HealthResponseDto } from './dto/health-response.dto.js';
import { HEALTH_ROUTE } from './health.constants.js';
import { HealthService } from './health.service.js';

@Public()
@Controller(HEALTH_ROUTE)
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  check(): HealthResponseDto {
    return this.healthService.check();
  }
}
