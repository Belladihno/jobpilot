import { Column, Entity, JoinColumn, OneToOne } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { UserEntity } from '../../users/entities/user.entity';

@Entity('candidate_profiles')
export class CandidateProfileEntity extends BaseEntity {
  @Column({ name: 'user_id', type: 'uuid', unique: true })
  userId!: string;

  @OneToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: UserEntity;

  @Column({ type: 'varchar', length: 120, nullable: true })
  headline!: string | null;

  @Column({ name: 'professional_summary', type: 'text', nullable: true })
  professionalSummary!: string | null;

  @Column({ type: 'varchar', length: 120, nullable: true })
  location!: string | null;

  @Column({ type: 'varchar', length: 32, nullable: true })
  phone!: string | null;

  @Column({
    name: 'linkedin_url',
    type: 'varchar',
    length: 500,
    nullable: true,
  })
  linkedinUrl!: string | null;

  @Column({ name: 'github_url', type: 'varchar', length: 500, nullable: true })
  githubUrl!: string | null;

  @Column({
    name: 'portfolio_url',
    type: 'varchar',
    length: 500,
    nullable: true,
  })
  portfolioUrl!: string | null;

  @Column({ name: 'default_resume_id', type: 'uuid', nullable: true })
  defaultResumeId!: string | null;
}
