import { Injectable } from '@nestjs/common';
import { CandidateProfileEntity } from './entities/candidate-profile.entity';
import { CandidateProfileRepository } from './repositories/candidate-profile.repository';
import type { UpdateCandidateProfileDto } from './schemas/update-profile.schema';

const nullIfEmpty = (value: string): string | null =>
  value === '' ? null : value;

@Injectable()
export class CandidateService {
  constructor(private readonly profileRepository: CandidateProfileRepository) {}

  async getProfileByUserId(userId: string): Promise<CandidateProfileEntity> {
    const profile = await this.profileRepository.findByUserId(userId);
    if (!profile) {
      // Safety net for users registered before this table existed
      return this.profileRepository.createBlankForUser(userId);
    }
    return profile;
  }

  async updateProfile(
    userId: string,
    dto: UpdateCandidateProfileDto,
  ): Promise<CandidateProfileEntity> {
    const profile = await this.getProfileByUserId(userId);

    if (dto.headline !== undefined) {
      profile.headline = nullIfEmpty(dto.headline);
    }
    if (dto.professionalSummary !== undefined) {
      profile.professionalSummary = nullIfEmpty(dto.professionalSummary);
    }
    if (dto.location !== undefined) {
      profile.location = nullIfEmpty(dto.location);
    }
    if (dto.phone !== undefined) {
      profile.phone = nullIfEmpty(dto.phone);
    }
    if (dto.linkedinUrl !== undefined) {
      profile.linkedinUrl = nullIfEmpty(dto.linkedinUrl);
    }
    if (dto.githubUrl !== undefined) {
      profile.githubUrl = nullIfEmpty(dto.githubUrl);
    }
    if (dto.portfolioUrl !== undefined) {
      profile.portfolioUrl = nullIfEmpty(dto.portfolioUrl);
    }

    return this.profileRepository.save(profile);
  }
}
