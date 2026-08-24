import { Injectable } from '@nestjs/common';
import { JobPreferencesEntity } from './entities/job-preferences.entity';
import { JobPreferencesRepository } from './repositories/job-preferences.repository';
import type { UpdateJobPreferencesDto } from './schemas/update-job-preferences.schema';

@Injectable()
export class JobPreferencesService {
  constructor(
    private readonly preferencesRepository: JobPreferencesRepository,
  ) {}

  async getPreferencesByUserId(userId: string): Promise<JobPreferencesEntity> {
    const preferences = await this.preferencesRepository.findByUserId(userId);
    if (!preferences) {
      // Safety net for users registered before this table existed
      return this.preferencesRepository.createBlankForUser(userId);
    }
    return preferences;
  }

  async updatePreferences(
    userId: string,
    dto: UpdateJobPreferencesDto,
  ): Promise<JobPreferencesEntity> {
    const preferences = await this.getPreferencesByUserId(userId);

    if (dto.jobTitles !== undefined) {
      preferences.jobTitles = dto.jobTitles;
    }
    if (dto.locations !== undefined) {
      preferences.locations = dto.locations;
    }
    if (dto.remotePreference !== undefined) {
      preferences.remotePreference = dto.remotePreference;
    }
    if (dto.employmentTypes !== undefined) {
      preferences.employmentTypes = dto.employmentTypes;
    }
    if (dto.salaryMin !== undefined) {
      preferences.salaryMin = dto.salaryMin;
    }
    if (dto.salaryCurrency !== undefined) {
      preferences.salaryCurrency = dto.salaryCurrency;
    }
    if (dto.excludedKeywords !== undefined) {
      preferences.excludedKeywords = dto.excludedKeywords;
    }
    if (dto.requiredKeywords !== undefined) {
      preferences.requiredKeywords = dto.requiredKeywords;
    }
    if (dto.experienceLevels !== undefined) {
      preferences.experienceLevels = dto.experienceLevels;
    }
    if (dto.autoApplyEnabled !== undefined) {
      preferences.autoApplyEnabled = dto.autoApplyEnabled;
    }
    if (dto.minimumMatchScore !== undefined) {
      preferences.minimumMatchScore = dto.minimumMatchScore;
    }

    return this.preferencesRepository.save(preferences);
  }
}
