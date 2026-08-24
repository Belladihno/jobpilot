import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { uuidv7 } from 'uuidv7';
import { MessagingService } from '../../infrastructure/messaging/messaging.service';
import {
  EXCHANGE_JOBPILOT_EVENTS,
  ROUTING_KEY_RESUME_PROCESSING_REQUESTED,
} from '../../infrastructure/messaging/topology';
import { STORAGE_PROVIDER } from '../../infrastructure/storage/storage.provider';
import type { StorageProvider } from '../../infrastructure/storage/storage.provider';
import { ResumeEntity, ResumeStatus } from './entities/resume.entity';
import { ResumeRepository } from './repositories/resume.repository';
import { StructuredResumeRepository } from './repositories/structured-resume.repository';
import type { StructuredResume } from './schemas/structured-resume.schema';

export const MAX_RESUME_SIZE_BYTES = 10 * 1024 * 1024;

const ALLOWED_MIME_TYPES = new Map<string, string>([
  ['application/pdf', 'pdf'],
  [
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'docx',
  ],
]);

interface UploadInput {
  userId: string;
  fileName: string;
  mimeType: string;
  data: Buffer;
}

@Injectable()
export class ResumesService {
  private readonly logger = new Logger(ResumesService.name);

  constructor(
    private readonly resumeRepository: ResumeRepository,
    @Inject(STORAGE_PROVIDER) private readonly storageProvider: StorageProvider,
    private readonly messagingService: MessagingService,
    private readonly structuredResumeRepository: StructuredResumeRepository,
  ) {}

  async upload(input: UploadInput): Promise<ResumeEntity> {
    const extension = ALLOWED_MIME_TYPES.get(input.mimeType);
    if (!extension) {
      throw new BadRequestException(
        'Unsupported file type. Only PDF and DOCX are allowed',
      );
    }
    if (input.data.byteLength === 0) {
      throw new BadRequestException('File is empty');
    }
    if (input.data.byteLength > MAX_RESUME_SIZE_BYTES) {
      throw new BadRequestException('File exceeds the 10MB limit');
    }

    const storageKey = `resumes/${input.userId}/${uuidv7()}.${extension}`;

    await this.storageProvider.put(storageKey, input.data);

    try {
      const resume = await this.resumeRepository.create({
        userId: input.userId,
        fileName: input.fileName,
        mimeType: input.mimeType,
        fileSize: input.data.byteLength,
        storageKey,
        status: ResumeStatus.UPLOADED,
      });

      this.publishProcessingRequested(resume.id);

      return this.sanitizeResume(resume);
    } catch (err) {
      await this.storageProvider.delete(storageKey);
      throw err;
    }
  }

  private publishProcessingRequested(resumeId: string): void {
    try {
      this.messagingService.publish(
        EXCHANGE_JOBPILOT_EVENTS,
        ROUTING_KEY_RESUME_PROCESSING_REQUESTED,
        { resumeId },
      );
    } catch (err) {
      // Upload stays UPLOADED; the worker pipeline (Batch C) will consume it
      this.logger.error(
        `Failed to publish processing request for resume ${resumeId}`,
        err instanceof Error ? err.message : String(err),
      );
    }
  }

  async listByUser(userId: string): Promise<ResumeEntity[]> {
    const resumes = await this.resumeRepository.findByUserId(userId);
    return resumes.map((resume) => this.sanitizeResume(resume));
  }

  async getOwned(userId: string, resumeId: string): Promise<ResumeEntity> {
    const resume = await this.getOwnedEntity(userId, resumeId);
    return this.sanitizeResume(resume);
  }

  private sanitizeResume(resume: ResumeEntity): ResumeEntity {
    const { storageKey: _storageKey, ...safe } = resume;
    return safe as ResumeEntity;
  }

  async getParsedData(
    userId: string,
    resumeId: string,
  ): Promise<StructuredResume> {
    await this.getOwnedEntity(userId, resumeId);
    return this.structuredResumeRepository.findByResumeId(resumeId);
  }

  async updateParsedData(
    userId: string,
    resumeId: string,
    data: StructuredResume,
  ): Promise<StructuredResume> {
    const resume = await this.getOwnedEntity(userId, resumeId);
    if (resume.status !== ResumeStatus.PROCESSED) {
      throw new BadRequestException(
        `Resume is ${resume.status}; parsed data can only be edited while processed`,
      );
    }

    await this.structuredResumeRepository.replaceAllForResume(resumeId, data);
    return this.structuredResumeRepository.findByResumeId(resumeId);
  }

  async approve(userId: string, resumeId: string): Promise<ResumeEntity> {
    const resume = await this.getOwnedEntity(userId, resumeId);
    if (resume.status !== ResumeStatus.PROCESSED) {
      throw new BadRequestException(
        `Only processed resumes can be approved (current: ${resume.status})`,
      );
    }
    resume.approvedAt = new Date();
    await this.resumeRepository.save(resume);
    return this.sanitizeResume(resume);
  }

  /** Raw entity incl. storageKey — internal use only. */
  private async getOwnedEntity(
    userId: string,
    resumeId: string,
  ): Promise<ResumeEntity> {
    const resume = await this.resumeRepository.findById(resumeId);
    if (!resume || resume.userId !== userId) {
      throw new NotFoundException('Resume not found');
    }
    return resume;
  }
}
