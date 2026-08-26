import type { NormalizedJob } from '../../infrastructure/job-sources/normalized-job.schema';
import { MATCHING_WEIGHTS } from '../../config/configuration';
import type { EligibilityPreferences } from './eligibility.filter';

/** Candidate facts the scorer needs, resolved by MatchingService. */
export interface CandidateContext {
  skillNames: string[];
  prefs: EligibilityPreferences;
}

export interface ScoredMatch {
  score: number;
  matchReasons: string[];
  missingRequirements: string[];
}

const containsIgnoreCase = (haystack: string, needle: string): boolean =>
  haystack.toLowerCase().includes(needle.toLowerCase());

const postingText = (
  job: Pick<NormalizedJob, 'title' | 'description'>,
): string => `${job.title} ${job.description}`;

/**
 * Deterministic rule-based scoring (guide §3.8). Weights are configurable in
 * configuration.ts; every awarded component adds a reason and every lost
 * component adds a missing-requirement note so scores stay explainable.
 *
 * Unconstrained preferences award NEUTRAL FULL points — an absent preference
 * must not punish a job.
 */
export function scoreJob(
  job: Pick<
    NormalizedJob,
    | 'title'
    | 'description'
    | 'location'
    | 'remoteType'
    | 'employmentType'
    | 'experienceLevel'
    | 'salaryMin'
    | 'salaryMax'
  >,
  candidate: CandidateContext,
): ScoredMatch {
  const { prefs } = candidate;
  const matchReasons: string[] = [];
  const missingRequirements: string[] = [];
  const text = postingText(job);

  // --- skills -------------------------------------------------------------
  let skillPoints = 0;
  if (candidate.skillNames.length === 0) {
    missingRequirements.push('no skills recorded on the approved resume');
  } else {
    const matchedSkills = candidate.skillNames.filter((skill) =>
      containsIgnoreCase(text, skill),
    );
    skillPoints = Math.round(
      (matchedSkills.length / candidate.skillNames.length) *
        MATCHING_WEIGHTS.skills,
    );
    for (const skill of matchedSkills) {
      matchReasons.push(`skill "${skill}" appears in the posting`);
    }
    for (const skill of candidate.skillNames.filter(
      (skill) => !matchedSkills.includes(skill),
    )) {
      missingRequirements.push(`no mention of "${skill}"`);
    }
  }

  // --- title relevance ------------------------------------------------------
  let titlePoints = 0;
  if (prefs.jobTitles.length === 0) {
    titlePoints = MATCHING_WEIGHTS.title; // neutral
  } else {
    const matchedTitle = prefs.jobTitles.find((title) =>
      containsIgnoreCase(job.title, title),
    );
    if (matchedTitle) {
      titlePoints = MATCHING_WEIGHTS.title;
      matchReasons.push(`title aligns with preferred role "${matchedTitle}"`);
    } else {
      missingRequirements.push('title does not align with preferred roles');
    }
  }

  // --- experience level -----------------------------------------------------
  let experiencePoints = 0;
  if (prefs.experienceLevels.length === 0) {
    experiencePoints = MATCHING_WEIGHTS.experience; // neutral
  } else if (
    job.experienceLevel !== 'UNKNOWN' &&
    (prefs.experienceLevels as string[]).includes(job.experienceLevel)
  ) {
    experiencePoints = MATCHING_WEIGHTS.experience;
    matchReasons.push(`experience level "${job.experienceLevel}" matches`);
  } else {
    missingRequirements.push(
      `experience level "${job.experienceLevel}" is outside preferred levels`,
    );
  }

  // --- location / remote ----------------------------------------------------
  let locationPoints = 0;
  const remoteOk =
    prefs.remotePreference === 'ANY' ||
    job.remoteType === prefs.remotePreference;
  const locationOk =
    prefs.locations.length === 0 ||
    prefs.locations.some(
      (location) =>
        containsIgnoreCase(job.location, location) ||
        containsIgnoreCase(location, job.location),
    );
  if (remoteOk && locationOk) {
    locationPoints = MATCHING_WEIGHTS.location;
    if (prefs.remotePreference !== 'ANY') {
      matchReasons.push(`${job.remoteType.toLowerCase()} work matches`);
    }
  } else {
    if (!remoteOk) {
      missingRequirements.push(
        `"${job.remoteType}" is not the preferred work arrangement`,
      );
    }
    if (!locationOk) {
      missingRequirements.push(
        `location "${job.location}" is outside preferred locations`,
      );
    }
  }

  // --- preference alignment (employment 5 + salary 5) -----------------------
  let alignmentPoints = 0;

  const employmentNeutral = prefs.employmentTypes.length === 0;
  const employmentOk =
    employmentNeutral ||
    (prefs.employmentTypes as string[]).includes(job.employmentType);
  if (employmentOk) {
    alignmentPoints += 5;
  } else {
    missingRequirements.push(
      `"${job.employmentType}" is not a preferred employment type`,
    );
  }

  if (prefs.salaryMin === null || prefs.salaryMin === undefined) {
    alignmentPoints += 5; // neutral
  } else if (job.salaryMax === null || job.salaryMax === undefined) {
    alignmentPoints += 3; // unknown salary — partial credit
    missingRequirements.push('salary not disclosed');
  } else if (job.salaryMax >= prefs.salaryMin) {
    alignmentPoints += 5;
    matchReasons.push(`salary window reaches the ${prefs.salaryMin} minimum`);
  } else {
    missingRequirements.push(
      `salary below preferred minimum (${job.salaryMax} < ${prefs.salaryMin})`,
    );
  }

  const total =
    skillPoints +
    titlePoints +
    experiencePoints +
    locationPoints +
    alignmentPoints;

  return {
    score: Math.max(0, Math.min(100, Math.round(total))),
    matchReasons,
    missingRequirements,
  };
}
