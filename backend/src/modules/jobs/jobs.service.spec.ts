import { NotFoundException } from '@nestjs/common';
import { JobsService } from './jobs.service';
import { JobsRepository } from './repositories/jobs.repository';

describe('JobsService', () => {
  let jobsRepo: { findWithFilters: jest.Mock; findById: jest.Mock };
  let service: JobsService;

  beforeEach(() => {
    jobsRepo = {
      findWithFilters: jest.fn().mockResolvedValue([]),
      findById: jest.fn(),
    };
    service = new JobsService(jobsRepo as unknown as JobsRepository);
  });

  it('passes parsed filters down to the repository', async () => {
    await service.list({
      source: 'stub',
      location: 'Berlin',
      remoteType: 'REMOTE',
      postedAfter: '2026-08-01T00:00:00.000Z',
      limit: 25,
    });

    expect(jobsRepo.findWithFilters).toHaveBeenCalledWith({
      source: 'stub',
      location: 'Berlin',
      remoteType: 'REMOTE',
      postedAfter: new Date('2026-08-01T00:00:00.000Z'),
      limit: 25,
    });
  });

  it('returns the job when found', async () => {
    const entity = { id: 'job-1' };
    jobsRepo.findById.mockResolvedValue(entity);

    const result = await service.getById('job-1');
    expect(result).toBe(entity);
  });

  it('throws NotFound for unknown ids', async () => {
    jobsRepo.findById.mockResolvedValue(null);

    await expect(service.getById('missing')).rejects.toThrow(NotFoundException);
  });
});
