import type { ConsumeMessage } from 'amqplib';
import { JobDiscoveryConsumer } from './job-discovery.consumer';
import type { JobSourceAdapter } from '../../infrastructure/job-sources/job-source.adapter';
import type { NormalizedJob } from '../../infrastructure/job-sources/normalized-job.schema';

function message(payload: unknown): ConsumeMessage {
  const content =
    typeof payload === 'string'
      ? Buffer.from(payload)
      : Buffer.from(JSON.stringify(payload));
  return {
    content,
    fields: {},
    properties: {},
  } as unknown as ConsumeMessage;
}

const makeJob = (externalId: string): NormalizedJob => ({
  source: 'stub',
  externalId,
  title: 'Backend Engineer',
  company: 'Acme',
  description: 'Node.js role',
  location: 'Berlin',
  remoteType: 'REMOTE',
  employmentType: 'FULL_TIME',
  experienceLevel: 'SENIOR',
  salaryMin: null,
  salaryMax: null,
  salaryCurrency: null,
  applicationUrl: `https://jobs.example.com/${externalId}`,
  postedAt: null,
  expiresAt: null,
});

describe('JobDiscoveryConsumer', () => {
  let channel: { ack: jest.Mock; prefetch: jest.Mock; consume: jest.Mock };
  let registry: { get: jest.Mock };
  let jobsRepo: { upsertMany: jest.Mock; findByIds: jest.Mock };
  let matching: { computeMatchesForJobs: jest.Mock };
  let consumer: JobDiscoveryConsumer;

  beforeEach(async () => {
    channel = {
      ack: jest.fn(),
      prefetch: jest.fn().mockResolvedValue(undefined),
      consume: jest.fn().mockResolvedValue({ consumerTag: 'test' }),
    };
    registry = { get: jest.fn() };
    jobsRepo = {
      upsertMany: jest.fn().mockResolvedValue({
        insertedIds: ['j-1'],
        updatedIds: [],
        unchangedCount: 0,
      }),
      findByIds: jest.fn().mockResolvedValue([]),
    };
    matching = { computeMatchesForJobs: jest.fn().mockResolvedValue(0) };

    const connection = {
      createChannel: jest.fn().mockResolvedValue(channel),
    };
    consumer = new JobDiscoveryConsumer(
      connection as never,
      registry as never,
      jobsRepo as never,
      matching as never,
    );
    await consumer.start();
  });

  it('fetches, upserts, matches and acks a valid discovery request', async () => {
    const jobEntity = { id: 'j-1' };
    const adapter: JobSourceAdapter = {
      id: 'stub',
      fetchLatest: jest.fn().mockResolvedValue([makeJob('ext-1')]),
    };
    registry.get.mockReturnValue(adapter);
    jobsRepo.findByIds.mockResolvedValue([jobEntity]);

    await consumer.handle(message({ source: 'stub' }));

    expect(adapter.fetchLatest).toHaveBeenCalledTimes(1);
    expect(jobsRepo.upsertMany).toHaveBeenCalledWith([makeJob('ext-1')]);
    expect(jobsRepo.findByIds).toHaveBeenCalledWith(['j-1']);
    expect(matching.computeMatchesForJobs).toHaveBeenCalledWith([jobEntity]);
    expect(channel.ack).toHaveBeenCalledTimes(1);
  });

  it('skips the matching pass when nothing changed', async () => {
    const adapter: JobSourceAdapter = {
      id: 'stub',
      fetchLatest: jest.fn().mockResolvedValue([makeJob('ext-1')]),
    };
    registry.get.mockReturnValue(adapter);
    jobsRepo.upsertMany.mockResolvedValue({
      insertedIds: [],
      updatedIds: [],
      unchangedCount: 1,
    });

    await consumer.handle(message({ source: 'stub' }));

    expect(jobsRepo.findByIds).not.toHaveBeenCalled();
    expect(matching.computeMatchesForJobs).not.toHaveBeenCalled();
    expect(channel.ack).toHaveBeenCalledTimes(1);
  });

  it('acks and discards malformed payloads', async () => {
    await consumer.handle(message('not-json{{'));

    expect(registry.get).not.toHaveBeenCalled();
    expect(channel.ack).toHaveBeenCalledTimes(1);
  });

  it('acks and discards payloads failing the source schema', async () => {
    await consumer.handle(message({ wrong: 'shape' }));

    expect(registry.get).not.toHaveBeenCalled();
    expect(channel.ack).toHaveBeenCalledTimes(1);
  });

  it('acks and discards unknown sources', async () => {
    registry.get.mockReturnValue(null);

    await consumer.handle(message({ source: 'ghost' }));

    expect(jobsRepo.upsertMany).not.toHaveBeenCalled();
    expect(channel.ack).toHaveBeenCalledTimes(1);
  });

  it('acks without requeue when the adapter throws', async () => {
    const adapter: JobSourceAdapter = {
      id: 'stub',
      fetchLatest: jest.fn().mockRejectedValue(new Error('source down')),
    };
    registry.get.mockReturnValue(adapter);

    await consumer.handle(message({ source: 'stub' }));

    expect(jobsRepo.upsertMany).not.toHaveBeenCalled();
    expect(channel.ack).toHaveBeenCalledTimes(1);
  });

  it('acks even when persistence fails', async () => {
    const adapter: JobSourceAdapter = {
      id: 'stub',
      fetchLatest: jest.fn().mockResolvedValue([makeJob('ext-1')]),
    };
    registry.get.mockReturnValue(adapter);
    jobsRepo.upsertMany.mockRejectedValue(new Error('db down'));

    await consumer.handle(message({ source: 'stub' }));

    expect(channel.ack).toHaveBeenCalledTimes(1);
  });
});
