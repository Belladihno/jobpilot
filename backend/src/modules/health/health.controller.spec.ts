import type { Response } from 'express';
import type { AppConfig } from '../../config/configuration';
import { HealthController } from './health.controller';
import type { HealthResult } from './health.service';

describe('HealthController', () => {
  const fullResult: HealthResult = {
    status: 'ok',
    timestamp: '2026-08-22T00:00:00.000Z',
    services: { api: 'up', postgres: 'up', redis: 'up', rabbitmq: 'up' },
  };

  function makeController(env: string) {
    const healthService = { check: jest.fn().mockResolvedValue(fullResult) };
    const config = { app: { env } } as unknown as AppConfig;
    const controller = new HealthController(healthService as never, config);
    return controller;
  }

  function makeRes() {
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn((payload: unknown) => payload),
    };
    return res as unknown as Response & {
      status: jest.Mock;
      json: jest.Mock;
    };
  }

  it('exposes per-service detail outside production', async () => {
    const controller = makeController('development');
    const res = makeRes();

    await controller.check(res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ services: fullResult.services }),
    );
  });

  it('collapses service detail in production', async () => {
    const controller = makeController('production');
    const res = makeRes();

    await controller.check(res);

    expect(res.status).toHaveBeenCalledWith(200);
    const body = res.json.mock.calls[0][0] as Record<string, unknown>;
    expect(body).toEqual({
      status: 'ok',
      timestamp: fullResult.timestamp,
    });
    expect(body.services).toBeUndefined();
  });
});
