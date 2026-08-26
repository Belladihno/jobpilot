import type { CandidateContext } from './matching.scorer';
import { scoreJob } from './matching.scorer';

const job = (
  overrides: Partial<Parameters<typeof scoreJob>[0]> = {},
): Parameters<typeof scoreJob>[0] => ({
  title: 'Senior Backend Engineer',
  description: 'Node.js, TypeScript and PostgreSQL at scale',
  location: 'Berlin',
  remoteType: 'REMOTE',
  employmentType: 'FULL_TIME',
  experienceLevel: 'SENIOR',
  salaryMin: 70000,
  salaryMax: 100000,
  ...overrides,
});

const candidate = (
  overrides: Partial<CandidateContext> = {},
): CandidateContext => {
  const { prefs: prefOverrides, ...rest } = overrides;
  return {
    skillNames: ['Node.js', 'TypeScript', 'PostgreSQL'],
    prefs: {
      jobTitles: [],
      locations: [],
      remotePreference: 'ANY',
      employmentTypes: [],
      excludedKeywords: [],
      requiredKeywords: [],
      experienceLevels: [],
      salaryMin: null,
      ...prefOverrides,
    },
    ...rest,
  };
};

describe('scoreJob', () => {
  it('awards full marks when everything aligns', () => {
    const result = scoreJob(job(), candidate());
    expect(result.score).toBe(100);
  });

  it('loses all skill points but flags the gap when the resume has no skills', () => {
    const result = scoreJob(
      job(),
      candidate({ skillNames: [], prefs: { jobTitles: ['backend'] } as never }),
    );
    // 0 skills + title hit 20 + exp neutral 20 + loc 10 + align 10
    expect(result.score).toBe(60);
    expect(result.missingRequirements).toContain(
      'no skills recorded on the approved resume',
    );
  });

  it('scales skill points by hit ratio and reports gaps', () => {
    const result = scoreJob(
      job({ description: 'Node.js only role' }),
      candidate({ skillNames: ['Node.js', 'Kubernetes'] }),
    );
    expect(result.score).toBe(80); // 1 of 2 skills (20) + neutral title/exp + loc + align
    expect(result.matchReasons.join(' ')).toContain('Node.js');
    expect(result.missingRequirements).toContain('no mention of "Kubernetes"');
  });

  it('rewards title alignment with preferred roles', () => {
    const result = scoreJob(
      job(),
      candidate({
        prefs: { jobTitles: ['backend engineer'] } as never,
      }),
    );
    expect(result.score).toBe(100);
    expect(result.matchReasons.join(' ')).toContain('preferred role');
  });

  it('punishes unknown experience levels against explicit preferences', () => {
    const result = scoreJob(
      job({ experienceLevel: 'UNKNOWN' }),
      candidate({ prefs: { experienceLevels: ['SENIOR'] } as never }),
    );
    expect(result.score).toBe(80);
    expect(result.missingRequirements.join(' ')).toContain('experience level');
  });

  it('treats unconstrained experience as a pass', () => {
    const result = scoreJob(job({ experienceLevel: 'JUNIOR' }), candidate());
    expect(result.score).toBe(100);
  });

  it('fails location mismatch entirely', () => {
    const result = scoreJob(
      job(),
      candidate({
        prefs: { locations: ['Lisbon'], remotePreference: 'ONSITE' } as never,
      }),
    );
    expect(result.score).toBe(90);
    expect(result.missingRequirements).toHaveLength(2);
  });

  it('gives partial credit for undisclosed salary against a minimum', () => {
    const result = scoreJob(
      job({ salaryMax: null }),
      candidate({ prefs: { salaryMin: 50000 } as never }),
    );
    expect(result.score).toBe(98);
    expect(result.missingRequirements).toContain('salary not disclosed');
  });

  it('zeroes salary component below the preferred minimum', () => {
    const result = scoreJob(
      job({ salaryMax: 30000 }),
      candidate({ prefs: { salaryMin: 50000 } as never }),
    );
    expect(result.score).toBe(95);
    expect(result.missingRequirements.join(' ')).toContain(
      'below preferred minimum',
    );
  });

  it('rewards salary meeting the window', () => {
    const result = scoreJob(
      job({ salaryMax: 120000 }),
      candidate({ prefs: { salaryMin: 80000 } as never }),
    );
    expect(result.score).toBe(100);
    expect(result.matchReasons.join(' ')).toContain('salary window');
  });

  it('clamps to the 0..100 range', () => {
    const result = scoreJob(
      job({
        employmentType: 'UNKNOWN',
        remoteType: 'UNKNOWN',
        description: 'nothing relevant',
      }),
      candidate({
        skillNames: ['Rust'],
        prefs: {
          jobTitles: ['devops'],
          experienceLevels: ['LEAD'],
          locations: ['Tokyo'],
          remotePreference: 'HYBRID',
          employmentTypes: ['CONTRACT'],
          salaryMin: 999999,
        } as never,
      }),
    );
    expect(result.score).toBe(0); // every component lost, salary below minimum
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(100);
  });
});
