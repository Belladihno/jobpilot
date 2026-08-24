import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { ResumeEntity } from './resume.entity';

@Index('IDX_resume_education_resume_id', ['resumeId'])
@Entity('resume_educations')
export class ResumeEducationEntity extends BaseEntity {
  @Column({ name: 'resume_id', type: 'uuid' })
  resumeId!: string;

  @ManyToOne(() => ResumeEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'resume_id' })
  resume!: ResumeEntity;

  @Column({ type: 'varchar', length: 150 })
  institution!: string;

  @Column({ type: 'varchar', length: 120 })
  degree!: string;

  @Column({ type: 'varchar', length: 120, nullable: true })
  field!: string | null;

  @Column({ name: 'start_year', type: 'integer', nullable: true })
  startYear!: number | null;

  @Column({ name: 'end_year', type: 'integer', nullable: true })
  endYear!: number | null;
}
