import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { ResumeEntity } from './resume.entity';

@Index('IDX_resume_skills_resume_id', ['resumeId'])
@Entity('resume_skills')
export class ResumeSkillEntity extends BaseEntity {
  @Column({ name: 'resume_id', type: 'uuid' })
  resumeId!: string;

  @ManyToOne(() => ResumeEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'resume_id' })
  resume!: ResumeEntity;

  @Column({ type: 'varchar', length: 120 })
  name!: string;

  @Column({ type: 'varchar', length: 40, nullable: true })
  level!: string | null;
}
