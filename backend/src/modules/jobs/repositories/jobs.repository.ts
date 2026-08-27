import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { NormalizedJob } from '../../../infrastructure/job-sources/normalized-job.schema';
import { JobEntity } from '../entities/job.entity';

export interface UpsertManyResult {
  insertedIds: string[];
  updatedIds: string[];
  unchangedCount: number;
}

const CONTENT_FIELDS = [
  'title',
  'company',
  'description',
  'location',
  'remoteType',
  'employmentType',
  'experienceLevel',
  'salaryMin',
  'salaryMax',
  'salaryCurrency',
  'applicationUrl',
] as const;

const sameInstant = (
  a: Date | string | null,
  b: Date | string | null,
): boolean => {
  if (a === b) return true;
  if (!a || !b) return false;
  return new Date(a).getTime() === new Date(b).getTime();
};

//True when persisted row content differs from the freshly normalized data.
export function contentChanged(
  existing: JobEntity,
  job: NormalizedJob,
): boolean {
  for (const field of CONTENT_FIELDS) {
    if (existing[field] !== job[field]) {
      return true;
    }
  }
  if (!sameInstant(existing.postedAt, job.postedAt)) return true;
  if (!sameInstant(existing.expiresAt, job.expiresAt)) return true;
  return false;
}

const byKey = (source: string, externalId: string): string =>
  `${source}|${externalId}`;

/**
 * Partitions incoming normalized jobs against known rows.
 * New sources become inserts; known rows are mutated in place only when
 * their content actually changed (preserving discoveredAt and id).
 */
export function partitionIncoming(
  existingRows: JobEntity[],
  incoming: NormalizedJob[],
  now: Date,
): { toInsert: JobEntity[]; toUpdate: JobEntity[]; unchangedCount: number } {
  const existingByKey = new Map(
    existingRows.map((row) => [byKey(row.source, row.externalId), row]),
  );

  const toInsert: JobEntity[] = [];
  const toUpdate: JobEntity[] = [];
  let unchangedCount = 0;

  for (const job of incoming) {
    const existing = existingByKey.get(byKey(job.source, job.externalId));

    if (!existing) {
      toInsert.push(
        Object.assign(new JobEntity(), {
          source: job.source,
          externalId: job.externalId,
          title: job.title,
          company: job.company,
          description: job.description,
          location: job.location,
          remoteType: job.remoteType,
          employmentType: job.employmentType,
          experienceLevel: job.experienceLevel,
          salaryMin: job.salaryMin,
          salaryMax: job.salaryMax,
          salaryCurrency: job.salaryCurrency,
          applicationUrl: job.applicationUrl,
          postedAt: job.postedAt ? new Date(job.postedAt) : null,
          expiresAt: job.expiresAt ? new Date(job.expiresAt) : null,
          discoveredAt: now,
        }),
      );
      continue;
    }

    if (contentChanged(existing, job)) {
      existing.title = job.title;
      existing.company = job.company;
      existing.description = job.description;
      existing.location = job.location;
      existing.remoteType = job.remoteType;
      existing.employmentType = job.employmentType;
      existing.experienceLevel = job.experienceLevel;
      existing.salaryMin = job.salaryMin;
      existing.salaryMax = job.salaryMax;
      existing.salaryCurrency = job.salaryCurrency;
      existing.applicationUrl = job.applicationUrl;
      existing.postedAt = job.postedAt ? new Date(job.postedAt) : null;
      existing.expiresAt = job.expiresAt ? new Date(job.expiresAt) : null;
      toUpdate.push(existing);
    } else {
      unchangedCount += 1;
    }
  }

  return { toInsert, toUpdate, unchangedCount };
}

@Injectable()
export class JobsRepository {
  constructor(
    @InjectRepository(JobEntity)
    private readonly repo: Repository<JobEntity>,
  ) {}

  async findById(id: string): Promise<JobEntity | null> {
    return this.repo.findOne({ where: { id } });
  }

  async findByIds(ids: string[]): Promise<JobEntity[]> {
    if (ids.length === 0) return [];
    return this.repo.find({ where: ids.map((id) => ({ id })) });
  }

  /** Filtered, newest-first listing for the /jobs browse surface. */
  async findWithFilters(filters: {
    source?: string;
    location?: string;
    remoteType?: string;
    postedAfter?: Date;
    limit: number;
  }): Promise<JobEntity[]> {
    const qb = this.repo
      .createQueryBuilder('job')
      .orderBy('job.discoveredAt', 'DESC')
      .take(filters.limit);

    if (filters.source) {
      qb.andWhere('job.source = :source', { source: filters.source });
    }
    if (filters.remoteType) {
      qb.andWhere('job.remoteType = :remoteType', {
        remoteType: filters.remoteType,
      });
    }
    if (filters.location) {
      // Strip LIKE wildcards from user input; parameterized so no SQL risk.
      const safe = filters.location.replace(/[%_]/g, '');
      qb.andWhere('job.location ILIKE :location', { location: `%${safe}%` });
    }
    if (filters.postedAfter) {
      qb.andWhere('job.postedAt >= :postedAfter', {
        postedAfter: filters.postedAfter,
      });
    }

    return qb.getMany();
  }

  /**
   * Deduplicated ingestion keyed by (source, externalId).
   * Returns ids of rows created or content-changed — the set that needs a
   * fresh matching pass — plus how many arrived identical.
   */
  async upsertMany(jobs: NormalizedJob[]): Promise<UpsertManyResult> {
    if (jobs.length === 0) {
      return { insertedIds: [], updatedIds: [], unchangedCount: 0 };
    }

    const existingRows = await this.repo.find({
      where: jobs.map((job) => ({
        source: job.source,
        externalId: job.externalId,
      })),
    });

    const { toInsert, toUpdate, unchangedCount } = partitionIncoming(
      existingRows,
      jobs,
      new Date(),
    );

    const inserted = toInsert.length > 0 ? await this.repo.save(toInsert) : [];
    const updated = toUpdate.length > 0 ? await this.repo.save(toUpdate) : [];

    return {
      insertedIds: inserted.map((row) => row.id),
      updatedIds: updated.map((row) => row.id),
      unchangedCount,
    };
  }
}
