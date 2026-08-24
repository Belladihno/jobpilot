import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ResumesService, MAX_RESUME_SIZE_BYTES } from './resumes.service';
import { ResumeRepository } from './repositories/resume.repository';
import { StructuredResumeRepository } from './repositories/structured-resume.repository';
import type { StorageProvider } from '../../infrastructure/storage/storage.provider';
import { MessagingService } from '../../infrastructure/messaging/messaging.service';
import { ResumeEntity, ResumeStatus } from './entities/resume.entity';

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
    resumeRepo = {
      create: jest.fn().mockResolvedValue(savedResume),
      findById: jest.fn(),
      save: jest
        .fn()
        .mockImplementation((r: ResumeEntity) => Promise.resolve(r)),
    };
    storage = {
      put: jest.fn().mockResolvedValue(undefined),
      delete: jest.fn(),
    };
    messaging = { publish: jest.fn().mockReturnValue(true) };
    service = new ResumesService(
      resumeRepo as unknown as ResumeRepository,
      storage as unknown as StorageProvider,
      messaging as unknown as MessagingService,
      {
        replaceAllForResume: jest.fn().mockResolvedValue(undefined),
        findByResumeId: jest.fn(),
      } as unknown as StructuredResumeRepository,
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

describe('ResumesService review loop', () => {
  let resumeRepo: { findById: jest.Mock; save: jest.Mock };
  let structuredRepo: {
    replaceAllForResume: jest.Mock;
    findByResumeId: jest.Mock;
  };
  let service: ResumesService;

  const processedResume = () =>
    ({
      id: 'r-1',
      userId: 'u-1',
      status: ResumeStatus.PROCESSED,
      storageKey: 'resumes/u-1/cv.pdf',
      approvedAt: null,
    }) as unknown as ResumeEntity;

  const parsedData = {
    skills: [{ name: 'Node.js' }],
    experience: [],
    education: [],
    certifications: [],
    projects: [],
  };

  beforeEach(() => {
    resumeRepo = {
      findById: jest.fn().mockResolvedValue(processedResume()),
      save: jest
        .fn()
        .mockImplementation((r: ResumeEntity) => Promise.resolve(r)),
    };
    structuredRepo = {
      replaceAllForResume: jest.fn().mockResolvedValue(undefined),
      findByResumeId: jest.fn().mockResolvedValue(parsedData),
    };
    service = new ResumesService(
      resumeRepo as unknown as ResumeRepository,
      { put: jest.fn(), delete: jest.fn() } as unknown as StorageProvider,
      { publish: jest.fn() } as unknown as MessagingService,
      structuredRepo as unknown as StructuredResumeRepository,
    );
  });

  describe('getParsedData', () => {
    it('returns assembled structured data for the owner', async () => {
      const result = await service.getParsedData('u-1', 'r-1');

      expect(structuredRepo.findByResumeId).toHaveBeenCalledWith('r-1');
      expect(result).toBe(parsedData);
    });

    it('throws NotFound when resume is missing or foreign', async () => {
      resumeRepo.findById.mockResolvedValue(null);

      await expect(service.getParsedData('u-1', 'missing')).rejects.toThrow(
        NotFoundException,
      );
      expect(structuredRepo.findByResumeId).not.toHaveBeenCalled();
    });

    it('throws NotFound when another user asks for the resume', async () => {
      await expect(service.getParsedData('u-2', 'r-1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('updateParsedData', () => {
    it('replaces and returns the corrected data while processed', async () => {
      const result = await service.updateParsedData('u-1', 'r-1', parsedData);

      expect(structuredRepo.replaceAllForResume).toHaveBeenCalledWith(
        'r-1',
        parsedData,
      );
      expect(result).toBe(parsedData);
    });

    it('rejects with BadRequest when resume is not processed', async () => {
      const uploaded = processedResume();
      uploaded.status = ResumeStatus.UPLOADED;
      resumeRepo.findById.mockResolvedValue(uploaded);

      await expect(
        service.updateParsedData('u-1', 'r-1', parsedData),
      ).rejects.toThrow(BadRequestException);
      expect(structuredRepo.replaceAllForResume).not.toHaveBeenCalled();
    });
  });

  describe('approve', () => {
    it('sets approvedAt on a processed resume and hides storageKey', async () => {
      const result = await service.approve('u-1', 'r-1');

      expect(result.approvedAt).toBeInstanceOf(Date);
      expect(result.storageKey).toBeUndefined();
      expect(resumeRepo.save).toHaveBeenCalledTimes(1);
    });

    it('rejects approval of a failed resume', async () => {
      const failed = processedResume();
      failed.status = ResumeStatus.FAILED;
      resumeRepo.findById.mockResolvedValue(failed);

      await expect(service.approve('u-1', 'r-1')).rejects.toThrow(
        BadRequestException,
      );
      expect(resumeRepo.save).not.toHaveBeenCalled();
    });

    it('throws NotFound for a foreign resume', async () => {
      await expect(service.approve('u-2', 'r-1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
