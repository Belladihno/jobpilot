import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { ResumeEntity } from './resume.entity';

@Index('IDX_resume_projects_resume_id', ['resumeId'])
@Entity('resume_projects')
export class ResumeProjectEntity extends BaseEntity {
  @Column({ name: 'resume_id', type: 'uuid' })
  resumeId!: string;

  @ManyToOne(() => ResumeEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'resume_id' })
  resume!: ResumeEntity;

  @Column({ type: 'varchar', length: 120 })
  name!: string;

  @Column({ type: 'varchar', length: 1000, nullable: true })
  description!: string | null;

  @Column({ type: 'jsonb', default: [] })
  technologies!: string[];
}
