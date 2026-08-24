import { JobPreferencesService } from './job-preferences.service';
import { JobPreferencesRepository } from './repositories/job-preferences.repository';

const makePreferences = () => ({
  id: 'pref-1',
  userId: 'u-1',
  jobTitles: [] as string[],
  locations: [] as string[],
  remotePreference: 'ANY',
  employmentTypes: [] as string[],
  salaryMin: null as number | null,
  salaryCurrency: null as string | null,
  excludedKeywords: [] as string[],
  requiredKeywords: [] as string[],
  experienceLevels: [] as string[],
  autoApplyEnabled: false,
  minimumMatchScore: 60,
});

describe('JobPreferencesService', () => {
  let preferencesRepo: {
    findByUserId: jest.Mock;
    createBlankForUser: jest.Mock;
    save: jest.Mock;
  };
  let service: JobPreferencesService;
  let preferences: ReturnType<typeof makePreferences>;

  beforeEach(() => {
    preferences = makePreferences();
    preferencesRepo = {
      findByUserId: jest.fn().mockResolvedValue(preferences),
      createBlankForUser: jest
        .fn()
        .mockImplementation((userId: string) =>
          Promise.resolve({ ...makePreferences(), userId }),
        ),
      save: jest
        .fn()
        .mockImplementation((p: typeof preferences) => Promise.resolve(p)),
    };
    service = new JobPreferencesService(
      preferencesRepo as unknown as JobPreferencesRepository,
    );
  });

  describe('getPreferencesByUserId', () => {
    it('returns the existing preferences', async () => {
      const result = await service.getPreferencesByUserId('u-1');
      expect(result).toBe(preferences);
      expect(preferencesRepo.createBlankForUser).not.toHaveBeenCalled();
    });

    it('creates blank defaults when none exist', async () => {
      preferencesRepo.findByUserId.mockResolvedValue(null);
      const result = await service.getPreferencesByUserId('u-9');
      expect(result.userId).toBe('u-9');
      expect(result.remotePreference).toBe('ANY');
      expect(result.minimumMatchScore).toBe(60);
    });
  });

  describe('updatePreferences', () => {
    it('replaces provided fields wholesale', async () => {
      await service.updatePreferences('u-1', {
        jobTitles: ['Backend Engineer', 'Platform Engineer'],
        remotePreference: 'REMOTE',
        minimumMatchScore: 75,
        autoApplyEnabled: true,
      });

      expect(preferences.jobTitles).toEqual([
        'Backend Engineer',
        'Platform Engineer',
      ]);
      expect(preferences.remotePreference).toBe('REMOTE');
      expect(preferences.minimumMatchScore).toBe(75);
      expect(preferences.autoApplyEnabled).toBe(true);
      expect(preferencesRepo.save).toHaveBeenCalledWith(preferences);
    });

    it('leaves untouched fields alone and clears nullable via null', async () => {
      preferences.salaryMin = 50000;
      preferences.salaryCurrency = 'EUR';
      preferences.locations = ['Berlin'];

      await service.updatePreferences('u-1', { salaryMin: null });

      expect(preferences.salaryMin).toBeNull();
      expect(preferences.salaryCurrency).toBe('EUR');
      expect(preferences.locations).toEqual(['Berlin']);
    });
  });
});
