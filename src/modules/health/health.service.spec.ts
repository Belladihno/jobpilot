import { HealthService } from './health.service';

describe('HealthService', () => {
  let dataSource: { query: jest.Mock };
  let redis: { ping: jest.Mock };
  let messaging: { isHealthy: jest.Mock };
  let service: HealthService;

  beforeEach(() => {
    dataSource = { query: jest.fn().mockResolvedValue([{ '?column?': 1 }]) };
    redis = { ping: jest.fn().mockResolvedValue('PONG') };
    messaging = { isHealthy: jest.fn().mockReturnValue(true) };
    service = new HealthService(
      dataSource as never,
      redis as never,
      messaging as never,
    );
  });

  it('returns ok when all up', async () => {
    const res = await service.check();
    expect(res.status).toBe('ok');
    expect(res.services).toEqual({
      api: 'up',
      postgres: 'up',
      redis: 'up',
      rabbitmq: 'up',
    });
  });

  it('returns error if postgres down', async () => {
    dataSource.query.mockRejectedValue(new Error('db down'));
    const res = await service.check();
    expect(res.status).toBe('error');
    expect(res.services.postgres).toBe('down');
  });

  it('returns error if redis down', async () => {
    redis.ping.mockRejectedValue(new Error('redis down'));
    const res = await service.check();
    expect(res.status).toBe('error');
    expect(res.services.redis).toBe('down');
  });

  it('returns error if rabbitmq down', async () => {
    messaging.isHealthy.mockReturnValue(false);
    const res = await service.check();
    expect(res.status).toBe('error');
    expect(res.services.rabbitmq).toBe('down');
  });
});
