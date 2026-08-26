import type {
  EligibilityPreferences,
  FilterableJob,
} from './eligibility.filter';
import { findIneligibilityReasons, isEligible } from './eligibility.filter';

const job = (overrides: Partial<FilterableJob> = {}): FilterableJob => ({
  title: 'Senior Backend Engineer',
  description: 'Node.js, TypeScript and PostgreSQL at scale',
  location: 'Berlin',
  remoteType: 'REMOTE',
  employmentType: 'FULL_TIME',
  ...overrides,
});

const prefs = (
  overrides: Partial<EligibilityPreferences> = {},
): EligibilityPreferences => ({
  jobTitles: [],
  locations: [],
  remotePreference: 'ANY',
  employmentTypes: [],
  excludedKeywords: [],
  requiredKeywords: [],
  experienceLevels: [],
  salaryMin: null,
  ...overrides,
});

describe('findIneligibilityReasons', () => {
  it('rejects nothing when every preference list is empty', () => {
    expect(findIneligibilityReasons(job(), prefs())).toEqual([]);
    expect(isEligible(job(), prefs())).toBe(true);
  });

  describe('job titles', () => {
    it('passes when a preferred title is contained in the job title', () => {
      const reasons = findIneligibilityReasons(
        job(),
        prefs({ jobTitles: ['backend engineer', 'data scientist'] }),
      );
      expect(reasons).toEqual([]);
    });

    it('is case-insensitive', () => {
      const reasons = findIneligibilityReasons(
        job(),
        prefs({ jobTitles: ['BACKEND'] }),
      );
      expect(reasons).toEqual([]);
    });

    it('rejects when no preferred title appears in the job title', () => {
      const reasons = findIneligibilityReasons(
        job(),
        prefs({ jobTitles: ['devops'] }),
      );
      expect(reasons).toEqual(['title does not match any preferred job title']);
    });
  });

  describe('locations', () => {
    it('matches when the preference is contained in the job location', () => {
      const reasons = findIneligibilityReasons(
        job(),
        prefs({ locations: ['berlin'] }),
      );
      expect(reasons).toEqual([]);
    });

    it('matches in the reverse direction too', () => {
      const reasons = findIneligibilityReasons(
        job({ location: 'Remote — EU' }),
        prefs({ locations: ['remote — eu timezone'] }),
      );
      expect(reasons).toEqual([]);
    });

    it('rejects unmatched locations', () => {
      const reasons = findIneligibilityReasons(
        job(),
        prefs({ locations: ['Lisbon'] }),
      );
      expect(reasons).toEqual([
        'location "Berlin" matches no preferred location',
      ]);
    });
  });

  describe('remote preference', () => {
    it('ANY accepts everything including unknown remote types', () => {
      const reasons = findIneligibilityReasons(
        job({ remoteType: 'UNKNOWN' }),
        prefs({ remotePreference: 'ANY' }),
      );
      expect(reasons).toEqual([]);
    });

    it('requires equality for a specific preference', () => {
      expect(
        findIneligibilityReasons(
          job({ remoteType: 'ONSITE' }),
          prefs({ remotePreference: 'REMOTE' }),
        ),
      ).toEqual(['remote type "ONSITE" does not match preference "REMOTE"']);

      expect(
        findIneligibilityReasons(job(), prefs({ remotePreference: 'REMOTE' })),
      ).toEqual([]);
    });
  });

  describe('employment types', () => {
    it('passes when the type is listed', () => {
      const reasons = findIneligibilityReasons(
        job(),
        prefs({ employmentTypes: ['PART_TIME', 'FULL_TIME'] }),
      );
      expect(reasons).toEqual([]);
    });

    it('rejects unlisted types including UNKNOWN jobs', () => {
      expect(
        findIneligibilityReasons(
          job(),
          prefs({ employmentTypes: ['CONTRACT'] }),
        ),
      ).toEqual(['employment type "FULL_TIME" is not among preferred types']);

      expect(
        findIneligibilityReasons(
          job({ employmentType: 'UNKNOWN' }),
          prefs({ employmentTypes: ['CONTRACT'] }),
        ),
      ).toEqual(['employment type "UNKNOWN" is not among preferred types']);
    });
  });

  describe('excluded keywords', () => {
    it('rejects per keyword found anywhere in title or description', () => {
      const reasons = findIneligibilityReasons(
        job(),
        prefs({ excludedKeywords: ['php', 'PostgreSQL'] }),
      );
      expect(reasons).toEqual([
        'excluded keyword "PostgreSQL" appears in the posting',
      ]);
    });
  });

  describe('required keywords', () => {
    it('passes only when ALL required keywords appear across title+description', () => {
      const reasons = findIneligibilityReasons(
        job(),
        prefs({ requiredKeywords: ['node.js', 'typescript'] }),
      );
      expect(reasons).toEqual([]);
    });

    it('lists every missing keyword', () => {
      const reasons = findIneligibilityReasons(
        job(),
        prefs({ requiredKeywords: ['node.js', 'kubernetes', 'graphql'] }),
      );
      expect(reasons).toEqual([
        'missing required keyword(s): kubernetes, graphql',
      ]);
    });
  });

  describe('combined violations', () => {
    it('reports one reason per failed constraint', () => {
      const reasons = findIneligibilityReasons(
        job({ employmentType: 'INTERNSHIP' }),
        prefs({
          jobTitles: ['devops'],
          remotePreference: 'HYBRID',
          employmentTypes: ['CONTRACT'],
          excludedKeywords: ['typescript'],
          requiredKeywords: ['rust'],
        }),
      );

      expect(reasons).toHaveLength(5);
      expect(
        isEligible(
          job({ employmentType: 'INTERNSHIP' }),
          prefs({
            jobTitles: ['devops'],
            remotePreference: 'HYBRID',
            employmentTypes: ['CONTRACT'],
            excludedKeywords: ['typescript'],
            requiredKeywords: ['rust'],
          }),
        ),
      ).toBe(false);
    });
  });
});
