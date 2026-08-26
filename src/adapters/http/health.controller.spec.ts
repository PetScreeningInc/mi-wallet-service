import { Test } from '@nestjs/testing';
import { HealthController } from './health.controller';

describe('HealthController', () => {
  it('returns ok for /health', () => {
    const controller = new HealthController();
    expect(controller.health()).toEqual({ status: 'ok' });
  });

  it('is registered in a Nest module', async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [HealthController],
    }).compile();
    const controller = moduleRef.get(HealthController);
    expect(controller.ready()).toEqual({ status: 'ok' });
  });
});
