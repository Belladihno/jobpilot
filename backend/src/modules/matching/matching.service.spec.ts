import { NotFoundException } from '@nestjs/common';
import type { JobMatchEntity } from './entities/job-match.entity';
import type { JobEntity } from '../jobs/entities/job.entity';
import { MatchingService } from './matching.service';

const makeJob = (id: string, source = 'stub'): JobEntity =>
  ({ id, source, title: `Job ${id}` }) as unknown as JobEntity;

const makeMatch = (
  id: string,
  jobId: string,
  score = 80,
  status = 'NEW',
): JobMatchEntity =>
  ({ id, userId: 'u-1', jobId, score, status }) as unknown as JobMatchEntity;

describe('MatchingService — match surfaces', () => {
  let matchRepo: {
    findByUserId: jest.Mock;
    findByIdAndUser: jest.Mock;
    save: jest.Mock;
  };
  let jobsRepo: { findByIds: jest.Mock; findById: jest.Mock };
  let service: MatchingService;

  beforeEach(() => {
    matchRepo = {
      findByUserId: jest.fn().mockResolvedValue([]),
      findByIdAndUser: jest.fn(),
      save: jest.fn((m: JobMatchEntity) => Promise.resolve(m)),
    };
    jobsRepo = {
      findByIds: jest.fn().mockResolvedValue([]),
      findById: jest.fn(),
    };
    service = new MatchingService(
      matchRepo as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      jobsRepo as never,
    );
  });

  describe('getMatches', () => {
    const matches = [
      makeMatch('m-1', 'job-1', 90),
      makeMatch('m-2', 'job-2', 60, 'SAVED'),
    ];

    it('attaches job summaries and keeps ranking', async () => {
      matchRepo.findByUserId.mockResolvedValue(matches);
      jobsRepo.findByIds.mockResolvedValue([
        makeJob('job-1'),
        makeJob('job-2'),
      ]);

      const result = await service.getMatches('u-1', { limit: 50 });

      expect(result).toHaveLength(2);
      expect(result[0].score).toBe(90);
      expect(result[0].job.title).toBe('Job job-1');
    });

    it('applies minScore and status filters', async () => {
      matchRepo.findByUserId.mockResolvedValue(matches);
      jobsRepo.findByIds.mockResolvedValue([
        makeJob('job-1'),
        makeJob('job-2'),
      ]);

      const result = await service.getMatches('u-1', {
        minScore: 80,
        status: 'NEW',
        limit: 50,
      });

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('m-1');
    });

    it('filters by job source after joining', async () => {
      matchRepo.findByUserId.mockResolvedValue(matches);
      jobsRepo.findByIds.mockResolvedValue([
        makeJob('job-1', 'adzuna'),
        makeJob('job-2'),
      ]);

      const result = await service.getMatches('u-1', {
        source: 'stub',
        limit: 50,
      });

      expect(result.map((match) => match.id)).toEqual(['m-2']);
    });

    it('drops matches whose job disappeared', async () => {
      matchRepo.findByUserId.mockResolvedValue(matches);
      jobsRepo.findByIds.mockResolvedValue([makeJob('job-1')]);

      const result = await service.getMatches('u-1', { limit: 50 });

      expect(result.map((match) => match.id)).toEqual(['m-1']);
    });
  });

  describe('updateMatchStatus', () => {
    it('sets status on an owned match', async () => {
      const match = makeMatch('m-1', 'job-1');
      matchRepo.findByIdAndUser.mockResolvedValue(match);
      jobsRepo.findById.mockResolvedValue(makeJob('job-1'));

      const result = await service.updateMatchStatus(
        'u-1',
        'm-1',
        'INTERESTED',
      );

      expect(matchRepo.save).toHaveBeenCalledTimes(1);
      expect(result.status).toBe('INTERESTED');
    });

    it('throws NotFound for a foreign or missing match', async () => {
      matchRepo.findByIdAndUser.mockResolvedValue(null);

      await expect(
        service.updateMatchStatus('u-1', 'missing', 'SAVED'),
      ).rejects.toThrow(NotFoundException);
      expect(matchRepo.save).not.toHaveBeenCalled();
    });
  });
});
