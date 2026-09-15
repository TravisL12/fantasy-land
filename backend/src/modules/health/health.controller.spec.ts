import { Test, type TestingModule } from '@nestjs/testing';
import { HEALTH_STATUS_OK } from './health.constants.js';
import { HealthController } from './health.controller.js';
import { HealthService } from './health.service.js';

describe('HealthController', () => {
  let controller: HealthController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [HealthService],
    }).compile();

    controller = module.get(HealthController);
  });

  it('reports ok status', () => {
    expect(controller.check().status).toBe(HEALTH_STATUS_OK);
  });
});
