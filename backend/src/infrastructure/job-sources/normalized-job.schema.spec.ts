import {
  NormalizedJobSchema,
  parseNormalizedJobs,
} from './normalized-job.schema';

const validJob = {
  source: 'stub',
  externalId: 'ext-1',
  title: 'Backend Engineer',
  company: 'Acme',
  description: 'Node.js role',
  location: 'Berlin',
  remoteType: 'REMOTE',
  employmentType: 'FULL_TIME',
  experienceLevel: 'SENIOR',
  salaryMin: 80000,
  salaryMax: 110000,
  salaryCurrency: 'EUR',
  applicationUrl: 'https://jobs.example.com/ext-1',
  postedAt: '2026-08-20T09:00:00.000Z',
  expiresAt: null,
};

describe('NormalizedJobSchema', () => {
  it('accepts a fully valid job', () => {
    const result = NormalizedJobSchema.safeParse(validJob);
    expect(result.success).toBe(true);
  });

  it('rejects unknown remote types', () => {
    const result = NormalizedJobSchema.safeParse({
      ...validJob,
      remoteType: 'TELEPORT',
    });
    expect(result.success).toBe(false);
  });

  it('rejects non-url application links', () => {
    const result = NormalizedJobSchema.safeParse({
      ...validJob,
      applicationUrl: 'not-a-url',
    });
    expect(result.success).toBe(false);
  });

  it('rejects lowercase currency codes', () => {
    const result = NormalizedJobSchema.safeParse({
      ...validJob,
      salaryCurrency: 'eur',
    });
    expect(result.success).toBe(false);
  });

  it('rejects negative salaries', () => {
    const result = NormalizedJobSchema.safeParse({
      ...validJob,
      salaryMin: -1,
    });
    expect(result.success).toBe(false);
  });

  it('rejects missing external ids', () => {
    const { externalId: _externalId, ...withoutId } = validJob;
    const result = NormalizedJobSchema.safeParse(withoutId);
    expect(result.success).toBe(false);
  });
});

describe('parseNormalizedJobs', () => {
  it('keeps valid jobs and counts invalid ones', () => {
    const invalid = { ...validJob, title: '' };

    const { jobs, invalidCount } = parseNormalizedJobs([validJob, invalid]);

    expect(jobs).toHaveLength(1);
    expect(jobs[0].externalId).toBe('ext-1');
    expect(invalidCount).toBe(1);
  });

  it('returns empty for an entirely malformed batch', () => {
    const { jobs, invalidCount } = parseNormalizedJobs([
      null as never,
      'garbage' as never,
    ]);
    expect(jobs).toEqual([]);
    expect(invalidCount).toBe(2);
  });
});
