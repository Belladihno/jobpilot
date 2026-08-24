import { CandidateService } from './candidate.service';
import { CandidateProfileRepository } from './repositories/candidate-profile.repository';
import { ResumesService } from '../resumes/resumes.service';

const makeProfile = () => ({
  id: 'p-1',
  userId: 'u-1',
  headline: null as string | null,
  phone: null as string | null,
  location: null as string | null,
  defaultResumeId: null as string | null,
});

describe('CandidateService', () => {
  let profileRepo: {
    findByUserId: jest.Mock;
    createBlankForUser: jest.Mock;
    save: jest.Mock;
  };
  let resumesService: { getOwned: jest.Mock };
  let service: CandidateService;
  let profile: ReturnType<typeof makeProfile>;

  beforeEach(() => {
    profile = makeProfile();
    profileRepo = {
      findByUserId: jest.fn().mockResolvedValue(profile),
      createBlankForUser: jest
        .fn()
        .mockImplementation((userId: string) =>
          Promise.resolve({ ...makeProfile(), userId }),
        ),
      save: jest
        .fn()
        .mockImplementation((p: typeof profile) => Promise.resolve(p)),
    };
    resumesService = { getOwned: jest.fn().mockResolvedValue(undefined) };
    service = new CandidateService(
      profileRepo as unknown as CandidateProfileRepository,
      resumesService as unknown as ResumesService,
    );
  });

  describe('getProfileByUserId', () => {
    it('returns the existing profile', async () => {
      const result = await service.getProfileByUserId('u-1');
      expect(result).toBe(profile);
      expect(profileRepo.createBlankForUser).not.toHaveBeenCalled();
    });

    it('creates a blank profile as safety net when none exists', async () => {
      profileRepo.findByUserId.mockResolvedValue(null);
      const result = await service.getProfileByUserId('u-9');
      expect(result.userId).toBe('u-9');
      expect(profileRepo.createBlankForUser).toHaveBeenCalledWith('u-9');
    });
  });

  describe('updateProfile', () => {
    it('updates provided fields and normalizes empty strings to null', async () => {
      profile.headline = 'Old headline';

      await service.updateProfile('u-1', {
        headline: 'Backend engineer',
        phone: '',
        location: 'Berlin',
      });

      expect(profile.headline).toBe('Backend engineer');
      expect(profile.phone).toBeNull();
      expect(profile.location).toBe('Berlin');
      expect(profileRepo.save).toHaveBeenCalledWith(profile);
    });

    it('leaves untouched fields alone when absent from dto', async () => {
      profile.headline = 'Keep me';

      await service.updateProfile('u-1', { location: 'Remote' });

      expect(profile.headline).toBe('Keep me');
      expect(profile.location).toBe('Remote');
    });
  });

  describe('setDefaultResume', () => {
    it('sets the default resume after verifying ownership', async () => {
      const result = await service.setDefaultResume('u-1', {
        resumeId: 'r-1',
      });

      expect(resumesService.getOwned).toHaveBeenCalledWith('u-1', 'r-1');
      expect(result.defaultResumeId).toBe('r-1');
    });

    it('clears the default resume on null without ownership check', async () => {
      profile.defaultResumeId = 'r-1';

      const result = await service.setDefaultResume('u-1', { resumeId: null });

      expect(resumesService.getOwned).not.toHaveBeenCalled();
      expect(result.defaultResumeId).toBeNull();
    });

    it('propagates NotFound when resume is missing or foreign', async () => {
      resumesService.getOwned.mockRejectedValue(new Error('Resume not found'));

      await expect(
        service.setDefaultResume('u-1', { resumeId: 'nope' }),
      ).rejects.toThrow('Resume not found');
      expect(profileRepo.save).not.toHaveBeenCalled();
    });
  });
});
