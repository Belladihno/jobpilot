import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import type {
  EmploymentType,
  ExperienceLevel,
  RemotePreference,
} from '../../job-preferences/entities/job-preferences.entity';

export type JobRemoteType = RemotePreference | 'UNKNOWN';

@Entity('jobs')
@Index('UQ_jobs_source_external_id', ['source', 'externalId'], {
  unique: true,
})
@Index('IX_jobs_discovered_at', ['discoveredAt'])
export class JobEntity extends BaseEntity {
  @Column({ type: 'varchar', length: 40 })
  source!: string;

  @Column({ name: 'external_id', type: 'varchar', length: 200 })
  externalId!: string;

  @Column({ type: 'varchar', length: 200 })
  title!: string;

  @Column({ type: 'varchar', length: 200 })
  company!: string;

  @Column({ type: 'text' })
  description!: string;

  @Column({ type: 'varchar', length: 200 })
  location!: string;

  @Column({ name: 'remote_type', type: 'varchar', length: 16 })
  remoteType!: JobRemoteType;

  @Column({ name: 'employment_type', type: 'varchar', length: 16 })
  employmentType!: EmploymentType | 'UNKNOWN';

  @Column({ name: 'experience_level', type: 'varchar', length: 16 })
  experienceLevel!: ExperienceLevel | 'UNKNOWN';

  @Column({ name: 'salary_min', type: 'integer', nullable: true })
  salaryMin!: number | null;

  @Column({ name: 'salary_max', type: 'integer', nullable: true })
  salaryMax!: number | null;

  @Column({
    name: 'salary_currency',
    type: 'varchar',
    length: 3,
    nullable: true,
  })
  salaryCurrency!: string | null;

  @Column({ name: 'application_url', type: 'varchar', length: 1000 })
  applicationUrl!: string;

  @Column({ name: 'posted_at', type: 'timestamptz', nullable: true })
  postedAt!: Date | null;

  @Column({ name: 'expires_at', type: 'timestamptz', nullable: true })
  expiresAt!: Date | null;

  @Column({ name: 'discovered_at', type: 'timestamptz' })
  discoveredAt!: Date;
}
