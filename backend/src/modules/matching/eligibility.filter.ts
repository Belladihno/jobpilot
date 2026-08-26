import type {
  EmploymentType,
  RemotePreference,
} from '../job-preferences/entities/job-preferences.entity';

/**
 * Structural subset both JobEntity and NormalizedJob satisfy — the filter
 * must stay usable pre-persistence and post-persistence.
 */
export interface FilterableJob {
  title: string;
  description: string;
  location: string;
  remoteType: string;
  employmentType: string;
}

export interface EligibilityPreferences {
  jobTitles: string[];
  locations: string[];
  remotePreference: RemotePreference;
  employmentTypes: EmploymentType[];
  excludedKeywords: string[];
  requiredKeywords: string[];
}

const containsIgnoreCase = (haystack: string, needle: string): boolean =>
  haystack.toLowerCase().includes(needle.toLowerCase());

const searchText = (job: FilterableJob): string =>
  `${job.title} ${job.description}`;

/**
 * Cheap preference-based rejects evaluated BEFORE scoring. Every constraint
 * is skipped while its preference list is empty — a blank profile filters
 * nothing out.
 *
 * Returns human-readable reasons; an empty array means eligible.
 */
export function findIneligibilityReasons(
  job: FilterableJob,
  prefs: EligibilityPreferences,
): string[] {
  const reasons: string[] = [];

  if (
    prefs.jobTitles.length > 0 &&
    !prefs.jobTitles.some((title) => containsIgnoreCase(job.title, title))
  ) {
    reasons.push('title does not match any preferred job title');
  }

  if (
    prefs.locations.length > 0 &&
    !prefs.locations.some(
      (location) =>
        containsIgnoreCase(job.location, location) ||
        containsIgnoreCase(location, job.location),
    )
  ) {
    reasons.push(`location "${job.location}" matches no preferred location`);
  }

  if (
    prefs.remotePreference !== 'ANY' &&
    job.remoteType !== prefs.remotePreference
  ) {
    reasons.push(
      `remote type "${job.remoteType}" does not match preference "${prefs.remotePreference}"`,
    );
  }

  if (
    prefs.employmentTypes.length > 0 &&
    !prefs.employmentTypes.includes(job.employmentType as EmploymentType)
  ) {
    reasons.push(
      `employment type "${job.employmentType}" is not among preferred types`,
    );
  }

  for (const keyword of prefs.excludedKeywords) {
    if (containsIgnoreCase(searchText(job), keyword)) {
      reasons.push(`excluded keyword "${keyword}" appears in the posting`);
    }
  }

  const missingRequired = prefs.requiredKeywords.filter(
    (keyword) => !containsIgnoreCase(searchText(job), keyword),
  );
  if (missingRequired.length > 0) {
    reasons.push(`missing required keyword(s): ${missingRequired.join(', ')}`);
  }

  return reasons;
}

export function isEligible(
  job: FilterableJob,
  prefs: EligibilityPreferences,
): boolean {
  return findIneligibilityReasons(job, prefs).length === 0;
}
