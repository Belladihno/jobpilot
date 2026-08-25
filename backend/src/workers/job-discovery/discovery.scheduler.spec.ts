import { CronJob } from 'cron';
import { DiscoveryScheduler } from './discovery.scheduler';
import type { JobSourceAdapter } from '../../infrastructure/job-sources/job-source.adapter';

describe('DiscoveryScheduler', () => {
  const makeAdapter = (id: string): JobSourceAdapter => ({
    id,
    fetchLatest: () => Promise.resolve([]),
  });

  const makeDeps = (enabled: JobSourceAdapter[]) => {
    const schedulerRegistry = {
      addCronJob: jest.fn(),
    };
    const messaging = { publish: jest.fn().mockReturnValue(true) };
    const registry = { getEnabled: jest.fn().mockReturnValue(enabled) };
    const config = { discovery: { cron: '0 */6 * * *' } };

    const scheduler = new DiscoveryScheduler(
      schedulerRegistry as never,
      messaging as never,
      registry as never,
      config as never,
    );
    return { scheduler, schedulerRegistry, messaging };
  };

  it('fans out one discovery request per enabled source', () => {
    const { scheduler, messaging } = makeDeps([
      makeAdapter('stub'),
      makeAdapter('other'),
    ]);

    scheduler.publishDiscoveryRequests();

    expect(messaging.publish).toHaveBeenCalledTimes(2);
    expect(messaging.publish).toHaveBeenCalledWith(
      'jobpilot.events',
      'job.discovery.requested',
      { source: 'stub' },
    );
    expect(messaging.publish).toHaveBeenCalledWith(
      'jobpilot.events',
      'job.discovery.requested',
      { source: 'other' },
    );
  });

  it('keeps publishing remaining sources when one publish fails', () => {
    const { scheduler, messaging } = makeDeps([
      makeAdapter('first'),
      makeAdapter('second'),
    ]);
    messaging.publish.mockImplementation(((_exchange: string) => {
      const calls = messaging.publish.mock.calls.length;
      if (calls === 0) throw new Error('broker down');
      return true;
    }) as never);

    scheduler.publishDiscoveryRequests();

    expect(messaging.publish).toHaveBeenCalledTimes(2);
  });

  it('registers a named cron job on init and stops cleanly', () => {
    const { scheduler, schedulerRegistry } = makeDeps([makeAdapter('stub')]);

    scheduler.onModuleInit();

    expect(schedulerRegistry.addCronJob).toHaveBeenCalledTimes(1);
    const [name, job] = (schedulerRegistry.addCronJob as jest.Mock).mock
      .calls[0];
    expect(name).toBe('job-discovery');
    expect(job).toBeInstanceOf(CronJob);
    void (job as CronJob).stop();
  });
});
