import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JobMatchEntity } from '../entities/job-match.entity';

export interface ComputedMatchRow {
  userId: string;
  jobId: string;
  resumeId: string;
  score: number;
  matchReasons: string[];
  missingRequirements: string[];
}

const byKey = (userId: string, jobId: string): string => `${userId}|${jobId}`;

@Injectable()
export class JobMatchRepository {
  constructor(
    @InjectRepository(JobMatchEntity)
    private readonly repo: Repository<JobMatchEntity>,
  ) {}

  /**
   * Recompute semantics per phase3 plan §0: refresh score/reasons/missing
   * (and which resume produced them), NEVER the user's feedback status.
   * New pairs land as status NEW.
   */
  async upsertComputed(rows: ComputedMatchRow[]): Promise<number> {
    if (rows.length === 0) return 0;

    const existing = await this.repo.find({
      where: rows.map((row) => ({
        userId: row.userId,
        jobId: row.jobId,
      })),
    });
    const existingByKey = new Map(
      existing.map((row) => [byKey(row.userId, row.jobId), row]),
    );

    const inserts: JobMatchEntity[] = [];
    const updates: JobMatchEntity[] = [];

    for (const row of rows) {
      const current = existingByKey.get(byKey(row.userId, row.jobId));
      if (current) {
        current.score = row.score;
        current.matchReasons = row.matchReasons;
        current.missingRequirements = row.missingRequirements;
        current.resumeId = row.resumeId;
        updates.push(current);
      } else {
        inserts.push(
          Object.assign(new JobMatchEntity(), {
            ...row,
            status: 'NEW' as const,
          }),
        );
      }
    }

    if (inserts.length > 0) await this.repo.save(inserts);
    if (updates.length > 0) await this.repo.save(updates);

    return inserts.length + updates.length;
  }

  async findByUserId(userId: string): Promise<JobMatchEntity[]> {
    return this.repo.find({
      where: { userId },
      order: { score: 'DESC' },
    });
  }

  async findByIdAndUser(
    id: string,
    userId: string,
  ): Promise<JobMatchEntity | null> {
    return this.repo.findOne({ where: { id, userId } });
  }

  async save(match: JobMatchEntity): Promise<JobMatchEntity> {
    return this.repo.save(match);
  }
}
