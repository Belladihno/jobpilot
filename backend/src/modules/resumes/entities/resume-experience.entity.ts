import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { ResumeEntity } from './resume.entity';

@Index('IDX_resume_experience_resume_id', ['resumeId'])
@Entity('resume_experiences')
export class ResumeExperienceEntity extends BaseEntity {
  @Column({ name: 'resume_id', type: 'uuid' })
  resumeId!: string;

  @ManyToOne(() => ResumeEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'resume_id' })
  resume!: ResumeEntity;

  @Column({ type: 'varchar', length: 120 })
  company!: string;

  @Column({ type: 'varchar', length: 120 })
  title!: string;

  @Column({ name: 'start_date', type: 'varchar', length: 20, nullable: true })
  startDate!: string | null;

  @Column({ name: 'end_date', type: 'varchar', length: 20, nullable: true })
  endDate!: string | null;

  @Column({ type: 'varchar', length: 1000, nullable: true })
  description!: string | null;

  @Column({ type: 'jsonb', default: [] })
  achievements!: string[];
}
