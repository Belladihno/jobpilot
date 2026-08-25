import { StubJobSource } from './stub-job.source';
import { NormalizedJobSchema } from '../normalized-job.schema';

describe('StubJobSource', () => {
  const source = new StubJobSource();

  it('exposes the stable stub id', () => {
    expect(source.id).toBe('stub');
  });

  it('returns deterministic normalized jobs', async () => {
    const first = await source.fetchLatest();
    const second = await source.fetchLatest();

    expect(first).toHaveLength(4);
    expect(first.map((job) => job.externalId)).toEqual(
      second.map((job) => job.externalId),
    );
  });

  it('emits jobs that all pass the NormalizedJob gate', async () => {
    for (const job of await source.fetchLatest()) {
      expect(NormalizedJobSchema.safeParse(job).success).toBe(true);
    }
  });

  it('maps raw fields correctly', async () => {
    const jobs = await source.fetchLatest();
    const senior = jobs.find(
      (job) => job.externalId === 'stub-senior-backend',
    )!;

    expect(senior.source).toBe('stub');
    expect(senior.company).toBe('Acme Cloud');
    expect(senior.remoteType).toBe('REMOTE');
    expect(senior.employmentType).toBe('FULL_TIME');
    expect(senior.experienceLevel).toBe('SENIOR');
    expect(senior.salaryMin).toBe(80000);
    expect(senior.salaryCurrency).toBe('EUR');
    expect(senior.postedAt).toBe('2026-08-20T09:00:00.000Z');
  });

  it('falls back to UNKNOWN for unmappable enums and null salaries', async () => {
    const jobs = await source.fetchLatest();
    const junior = jobs.find(
      (job) => job.externalId === 'stub-junior-support',
    )!;

    expect(junior.salaryMin).toBeNull();
    expect(junior.salaryCurrency).toBeNull();
    expect(junior.postedAt).toBeNull();
  });
});
