import { BadRequestException } from '@nestjs/common';
import { ResumesService, MAX_RESUME_SIZE_BYTES } from './resumes.service';
import { ResumeRepository } from './repositories/resume.repository';
import type { StorageProvider } from '../../infrastructure/storage/storage.provider';
import { MessagingService } from '../../infrastructure/messaging/messaging.service';
import type { ResumeEntity } from './entities/resume.entity';

const PDF_MIME = 'application/pdf';

describe('ResumesService.upload', () => {
  let resumeRepo: { create: jest.Mock };
  let storage: { put: jest.Mock; delete: jest.Mock };
  let messaging: { publish: jest.Mock };
  let service: ResumesService;

  const savedResume = {
    id: 'r-1',
    status: 'uploaded',
  } as unknown as ResumeEntity;

  const input = {
    userId: 'u-1',
    fileName: 'cv.pdf',
    mimeType: PDF_MIME,
    data: Buffer.from('%PDF-1.4 fake'),
  };

  beforeEach(() => {
    resumeRepo = { create: jest.fn().mockResolvedValue(savedResume) };
    storage = {
      put: jest.fn().mockResolvedValue(undefined),
      delete: jest.fn(),
    };
    messaging = { publish: jest.fn().mockReturnValue(true) };
    service = new ResumesService(
      resumeRepo as unknown as ResumeRepository,
      storage as unknown as StorageProvider,
      messaging as unknown as MessagingService,
    );
  });

  it('stores file, creates record and publishes processing request', async () => {
    const result = await service.upload(input);

    expect(result.id).toBe('r-1');
    expect(result.storageKey).toBeUndefined();
    expect(storage.put).toHaveBeenCalledWith(
      expect.stringMatching(/^resumes\/u-1\/[a-z0-9-]+\.pdf$/i),
      input.data,
    );
    expect(messaging.publish).toHaveBeenCalledWith(
      'jobpilot.events',
      'resume.processing.requested',
      { resumeId: 'r-1' },
    );
  });

  it('rejects unsupported mime type before touching storage', async () => {
    await expect(
      service.upload({ ...input, mimeType: 'text/plain' }),
    ).rejects.toThrow(BadRequestException);
    expect(storage.put).not.toHaveBeenCalled();
  });

  it('rejects empty file', async () => {
    await expect(
      service.upload({ ...input, data: Buffer.alloc(0) }),
    ).rejects.toThrow('File is empty');
  });

  it('rejects oversized file', async () => {
    const big = Buffer.alloc(MAX_RESUME_SIZE_BYTES + 1);
    await expect(service.upload({ ...input, data: big })).rejects.toThrow(
      '10MB limit',
    );
    expect(storage.put).not.toHaveBeenCalled();
  });

  it('deletes stored file if database insert fails', async () => {
    resumeRepo.create.mockRejectedValue(new Error('db down'));
    await expect(service.upload(input)).rejects.toThrow('db down');
    expect(storage.delete).toHaveBeenCalledWith(
      expect.stringMatching(/^resumes\/u-1\//),
    );
  });

  it('still succeeds when publishing fails (stays uploaded)', async () => {
    messaging.publish.mockImplementation(() => {
      throw new Error('broker down');
    });
    const result = await service.upload(input);
    expect(result.id).toBe('r-1');
  });
});
