import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { ResumeEntity } from './resume.entity';

@Index('IDX_resume_certifications_resume_id', ['resumeId'])
@Entity('resume_certifications')
export class ResumeCertificationEntity extends BaseEntity {
  @Column({ name: 'resume_id', type: 'uuid' })
  resumeId!: string;

  @ManyToOne(() => ResumeEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'resume_id' })
  resume!: ResumeEntity;

  @Column({ type: 'varchar', length: 150 })
  name!: string;

  @Column({ type: 'varchar', length: 120, nullable: true })
  issuer!: string | null;

  @Column({ name: 'issued_at', type: 'varchar', length: 20, nullable: true })
  issuedAt!: string | null;
}
