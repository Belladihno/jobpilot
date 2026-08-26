import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { JobEntity } from '../../jobs/entities/job.entity';
import { ResumeEntity } from '../../resumes/entities/resume.entity';
import { UserEntity } from '../../users/entities/user.entity';

export const MATCH_STATUSES = [
  'NEW',
  'INTERESTED',
  'SAVED',
  'DISMISSED',
  'APPLIED',
] as const;
export type MatchStatus = (typeof MATCH_STATUSES)[number];

/**
 * Per-candidate relevance for a shared job. The (userId, jobId) pair is
 * unique; recomputes refresh score/reasons but never the user's status.
 */
@Entity('job_matches')
@Index('UQ_job_matches_user_job', ['userId', 'jobId'], { unique: true })
@Index('IX_job_matches_user_score', ['userId', 'score'])
export class JobMatchEntity extends BaseEntity {
  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: UserEntity;

  @Column({ name: 'job_id', type: 'uuid' })
  jobId!: string;

  @ManyToOne(() => JobEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'job_id' })
  job!: JobEntity;

  @Column({ name: 'resume_id', type: 'uuid' })
  resumeId!: string;

  @ManyToOne(() => ResumeEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'resume_id' })
  resume!: ResumeEntity;

  @Column({ type: 'integer' })
  score!: number;

  @Column({ name: 'match_reasons', type: 'jsonb', default: '[]' })
  matchReasons!: string[];

  @Column({
    name: 'missing_requirements',
    type: 'jsonb',
    default: '[]',
  })
  missingRequirements!: string[];

  @Column({ type: 'varchar', length: 16, default: 'NEW' })
  status!: MatchStatus;
}
