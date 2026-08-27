import { Injectable, NotFoundException } from '@nestjs/common';
import { CandidateProfileRepository } from '../candidate/repositories/candidate-profile.repository';
import { JobPreferencesRepository } from '../job-preferences/repositories/job-preferences.repository';
import type { JobEntity } from '../jobs/entities/job.entity';
import { JobsRepository } from '../jobs/repositories/jobs.repository';
import { StructuredResumeRepository } from '../resumes/repositories/structured-resume.repository';
import { ResumesService } from '../resumes/resumes.service';
import type { EligibilityPreferences } from './eligibility.filter';
import { isEligible } from './eligibility.filter';
import type { JobMatchEntity, MatchStatus } from './entities/job-match.entity';
import type { ComputedMatchRow } from './repositories/job-match.repository';
import { JobMatchRepository } from './repositories/job-match.repository';
import { scoreJob } from './matching.scorer';

const BLANK_PREFS: EligibilityPreferences = {
  jobTitles: [],
  locations: [],
  remotePreference: 'ANY',
  employmentTypes: [],
  excludedKeywords: [],
  requiredKeywords: [],
  experienceLevels: [],
  salaryMin: null,
};

@Injectable()
export class MatchingService {
  constructor(
    private readonly jobMatchRepository: JobMatchRepository,
    private readonly preferencesRepository: JobPreferencesRepository,
    private readonly profileRepository: CandidateProfileRepository,
    private readonly structuredResumeRepository: StructuredResumeRepository,
    private readonly resumesService: ResumesService,
    private readonly jobsRepository: JobsRepository,
  ) {}

  /**
   * Recomputes matches for every user with a designated default resume,
   * against the given (new or changed) jobs. Eligible-only, feedback-safe.
   * Returns how many match rows were created or refreshed.
   */
  async computeMatchesForJobs(jobs: JobEntity[]): Promise<number> {
    if (jobs.length === 0) return 0;

    const profiles = await this.profileRepository.findWithDefaultResume();
    let touched = 0;

    for (const profile of profiles) {
      const rows = await this.buildMatchesForUser(
        profile.userId,
        profile.defaultResumeId!,
        jobs,
      );
      touched += await this.jobMatchRepository.upsertComputed(rows);
    }

    return touched;
  }

  private async buildMatchesForUser(
    userId: string,
    defaultResumeId: string,
    jobs: JobEntity[],
  ): Promise<ComputedMatchRow[]> {
    // Matching operates on APPROVED candidate data only (guide §2.9).
    const resume = await this.resumesService.getOwned(userId, defaultResumeId);
    if (!resume.approvedAt) return [];

    const prefsRecord = await this.preferencesRepository.findByUserId(userId);
    const prefs: EligibilityPreferences = {
      jobTitles: prefsRecord?.jobTitles ?? BLANK_PREFS.jobTitles,
      locations: prefsRecord?.locations ?? BLANK_PREFS.locations,
      remotePreference: prefsRecord?.remotePreference ?? 'ANY',
      employmentTypes:
        prefsRecord?.employmentTypes ?? BLANK_PREFS.employmentTypes,
      excludedKeywords:
        prefsRecord?.excludedKeywords ?? BLANK_PREFS.excludedKeywords,
      requiredKeywords:
        prefsRecord?.requiredKeywords ?? BLANK_PREFS.requiredKeywords,
      experienceLevels:
        prefsRecord?.experienceLevels ?? BLANK_PREFS.experienceLevels,
      salaryMin: prefsRecord?.salaryMin ?? BLANK_PREFS.salaryMin,
    };

    const structured =
      await this.structuredResumeRepository.findByResumeId(defaultResumeId);
    const skillNames = structured.skills.map((skill) => skill.name);
    const candidate = { skillNames, prefs };

    const rows: ComputedMatchRow[] = [];
    for (const job of jobs) {
      if (!isEligible(job, prefs)) continue;
      const scored = scoreJob(job, candidate);
      rows.push({
        userId,
        jobId: job.id,
        resumeId: defaultResumeId,
        score: scored.score,
        matchReasons: scored.matchReasons,
        missingRequirements: scored.missingRequirements,
      });
    }
    return rows;
  }

  /** Own matches with the attached job summary, filtered and ranked. */
  async getMatches(
    userId: string,
    filters: {
      minScore?: number;
      status?: MatchStatus;
      source?: string;
      limit: number;
    },
  ): Promise<Array<JobMatchEntity & { job: JobEntity }>> {
    let matches = await this.jobMatchRepository.findByUserId(userId);

    if (filters.minScore !== undefined) {
      matches = matches.filter((match) => match.score >= filters.minScore!);
    }
    if (filters.status) {
      matches = matches.filter((match) => match.status === filters.status);
    }

    const jobs = await this.jobsRepository.findByIds(
      matches.map((match) => match.jobId),
    );
    const jobsById = new Map(jobs.map((job) => [job.id, job]));

    return matches
      .map((match) => {
        const job = jobsById.get(match.jobId);
        return job ? Object.assign(match, { job }) : null;
      })
      .filter(
        (match): match is JobMatchEntity & { job: JobEntity } => match !== null,
      )
      .filter((match) => !filters.source || match.job.source === filters.source)
      .slice(0, filters.limit);
  }

  async getMatch(
    userId: string,
    matchId: string,
  ): Promise<JobMatchEntity & { job: JobEntity }> {
    const match = await this.findOwnedWithJob(userId, matchId);
    return match;
  }

  async updateMatchStatus(
    userId: string,
    matchId: string,
    status: MatchStatus,
  ): Promise<JobMatchEntity & { job: JobEntity }> {
    const match = await this.findOwnedWithJob(userId, matchId);
    match.status = status;
    await this.jobMatchRepository.save(match);
    return match;
  }

  private async findOwnedWithJob(
    userId: string,
    matchId: string,
  ): Promise<JobMatchEntity & { job: JobEntity }> {
    // Ownership is enforced by scoping the lookup to the caller's userId.
    const match = await this.jobMatchRepository.findByIdAndUser(
      matchId,
      userId,
    );
    if (!match) {
      throw new NotFoundException('Match not found');
    }
    const job = await this.jobsRepository.findById(match.jobId);
    if (!job) {
      throw new NotFoundException('Match not found');
    }
    return Object.assign(match, { job });
  }
}
