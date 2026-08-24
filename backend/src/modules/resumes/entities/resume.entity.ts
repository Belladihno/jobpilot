import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';

export enum ResumeStatus {
  UPLOADED = 'uploaded',
  PROCESSING = 'processing',
  PROCESSED = 'processed',
  FAILED = 'failed',
}

@Index('IDX_resumes_user_id', ['userId'])
@Index('UQ_resumes_storage_key', ['storageKey'], { unique: true })
@Entity('resumes')
export class ResumeEntity extends BaseEntity {
  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @Column({ name: 'file_name', type: 'varchar', length: 255 })
  fileName!: string;

  @Column({ name: 'mime_type', type: 'varchar', length: 100 })
  mimeType!: string;

  @Column({ name: 'file_size', type: 'integer' })
  fileSize!: number;

  @Column({ name: 'storage_key', type: 'varchar', length: 512 })
  storageKey!: string;

  @Column({
    type: 'enum',
    enum: ResumeStatus,
    default: ResumeStatus.UPLOADED,
  })
  status!: ResumeStatus;

  @Column({ name: 'extracted_text', type: 'text', nullable: true })
  extractedText!: string | null;

  @Column({ name: 'processing_error', type: 'text', nullable: true })
  processingError!: string | null;
}
