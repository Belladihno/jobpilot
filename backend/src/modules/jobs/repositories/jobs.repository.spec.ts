import type { NormalizedJob } from '../../../infrastructure/job-sources/normalized-job.schema';
import {
  JobsRepository,
  contentChanged,
  partitionIncoming,
} from './jobs.repository';
import { JobEntity } from '../entities/job.entity';

const now = new Date('2026-08-25T00:00:00.000Z');

const makeNormalized = (
  overrides: Partial<NormalizedJob> = {},
): NormalizedJob => ({
  source: 'stub',
  externalId: 'ext-1',
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
  applicationUrl: 'https://jobs.example.com/ext-1',
  postedAt: '2026-08-20T09:00:00.000Z',
  expiresAt: null,
  ...overrides,
});

const makeExisting = (overrides: Partial<JobEntity> = {}): JobEntity =>
  Object.assign(new JobEntity(), {
    id: 'db-1',
    source: 'stub',
    externalId: 'ext-1',
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
    applicationUrl: 'https://jobs.example.com/ext-1',
    postedAt: new Date('2026-08-20T09:00:00.000Z'),
    expiresAt: null,
    discoveredAt: new Date('2026-08-01T00:00:00.000Z'),
    ...overrides,
  });

describe('partitionIncoming', () => {
  it('routes unseen jobs to insert with discoveredAt stamped', () => {
    const { toInsert, toUpdate, unchangedCount } = partitionIncoming(
      [],
      [makeNormalized()],
      now,
    );

    expect(toInsert).toHaveLength(1);
    expect(toInsert[0].externalId).toBe('ext-1');
    expect(toInsert[0].discoveredAt).toBe(now);
    expect(toUpdate).toHaveLength(0);
    expect(unchangedCount).toBe(0);
  });

  it('counts identical jobs as unchanged without touching them', () => {
    const { toInsert, toUpdate, unchangedCount } = partitionIncoming(
      [makeExisting()],
      [makeNormalized()],
      now,
    );

    expect(toInsert).toHaveLength(0);
    expect(toUpdate).toHaveLength(0);
    expect(unchangedCount).toBe(1);
  });

  it('routes changed jobs to update preserving identity', () => {
    const existing = makeExisting({ title: 'Outdated Title' });

    const { toUpdate } = partitionIncoming([existing], [makeNormalized()], now);

    expect(toUpdate).toHaveLength(1);
    expect(toUpdate[0].id).toBe('db-1');
    expect(toUpdate[0].title).toBe('Backend Engineer');
    expect(toUpdate[0].discoveredAt).toEqual(existing.discoveredAt);
  });

  it('treats equal instants across string/date representations as unchanged', () => {
    const existing = makeExisting();
    // postedAt stored as Date; incoming arrives as ISO string of same instant
    const { unchangedCount } = partitionIncoming(
      [existing],
      [makeNormalized()],
      now,
    );

    expect(unchangedCount).toBe(1);
  });

  it('detects a changed instant as an update', () => {
    const existing = makeExisting({
      postedAt: new Date('2026-08-21T09:00:00.000Z'),
    });

    const { toUpdate } = partitionIncoming([existing], [makeNormalized()], now);

    expect(toUpdate).toHaveLength(1);
  });
});

describe('contentChanged', () => {
  it('flags scalar field differences', () => {
    expect(
      contentChanged(makeExisting(), makeNormalized({ company: 'Other' })),
    ).toBe(true);
  });

  it('flags null-to-value transitions', () => {
    expect(
      contentChanged(makeExisting(), makeNormalized({ salaryMin: 50000 })),
    ).toBe(true);
  });
});

describe('JobsRepository.upsertMany', () => {
  const makeRepo = (existingRows: JobEntity[]) => {
    const repo = {
      find: jest.fn().mockResolvedValue(existingRows),
      save: jest.fn((rows: unknown[]) => Promise.resolve(rows)),
    };
    const repository = new JobsRepository(repo as never);
    return { repository, findMock: repo.find };
  };

  it('short-circuits on empty batches without querying', async () => {
    const { repository, findMock } = makeRepo([]);

    const result = await repository.upsertMany([]);

    expect(findMock).not.toHaveBeenCalled();
    expect(result).toEqual({
      insertedIds: [],
      updatedIds: [],
      unchangedCount: 0,
    });
  });

  it('queries only the incoming composite keys', async () => {
    const { repository, findMock } = makeRepo([]);

    await repository.upsertMany([
      makeNormalized(),
      makeNormalized({ externalId: 'ext-2' }),
    ]);

    expect(findMock).toHaveBeenCalledWith({
      where: [
        { source: 'stub', externalId: 'ext-1' },
        { source: 'stub', externalId: 'ext-2' },
      ],
    });
  });
});
