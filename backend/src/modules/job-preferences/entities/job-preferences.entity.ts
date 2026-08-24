import { Column, Entity, JoinColumn, OneToOne } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { UserEntity } from '../../users/entities/user.entity';

export const REMOTE_PREFERENCES = [
  'REMOTE',
  'HYBRID',
  'ONSITE',
  'ANY',
] as const;
export type RemotePreference = (typeof REMOTE_PREFERENCES)[number];

export const EMPLOYMENT_TYPES = [
  'FULL_TIME',
  'PART_TIME',
  'CONTRACT',
  'INTERNSHIP',
  'TEMPORARY',
] as const;
export type EmploymentType = (typeof EMPLOYMENT_TYPES)[number];

export const EXPERIENCE_LEVELS = ['JUNIOR', 'MID', 'SENIOR', 'LEAD'] as const;
export type ExperienceLevel = (typeof EXPERIENCE_LEVELS)[number];

@Entity('job_preferences')
export class JobPreferencesEntity extends BaseEntity {
  @Column({ name: 'user_id', type: 'uuid', unique: true })
  userId!: string;

  @OneToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: UserEntity;

  @Column({ name: 'job_titles', type: 'jsonb', default: '[]' })
  jobTitles!: string[];

  @Column({ type: 'jsonb', default: '[]' })
  locations!: string[];

  @Column({
    name: 'remote_preference',
    type: 'varchar',
    length: 16,
    default: 'ANY',
  })
  remotePreference!: RemotePreference;

  @Column({ name: 'employment_types', type: 'jsonb', default: '[]' })
  employmentTypes!: EmploymentType[];

  @Column({ name: 'salary_min', type: 'integer', nullable: true })
  salaryMin!: number | null;

  @Column({
    name: 'salary_currency',
    type: 'varchar',
    length: 3,
    nullable: true,
  })
  salaryCurrency!: string | null;

  @Column({
    name: 'excluded_keywords',
    type: 'jsonb',
    default: '[]',
  })
  excludedKeywords!: string[];

  @Column({
    name: 'required_keywords',
    type: 'jsonb',
    default: '[]',
  })
  requiredKeywords!: string[];

  @Column({ name: 'experience_levels', type: 'jsonb', default: '[]' })
  experienceLevels!: ExperienceLevel[];

  @Column({
    name: 'auto_apply_enabled',
    type: 'boolean',
    default: false,
  })
  autoApplyEnabled!: boolean;

  @Column({
    name: 'minimum_match_score',
    type: 'integer',
    default: 60,
  })
  minimumMatchScore!: number;
}
