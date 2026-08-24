import { Controller, Get, Patch } from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ZodBody } from '../../common/decorators/zod-body.decorator';
import type { UserEntity } from '../users/entities/user.entity';
import { CandidateService } from './candidate.service';
import { SetDefaultResumeSchema } from './schemas/set-default-resume.schema';
import type { SetDefaultResumeDto } from './schemas/set-default-resume.schema';
import { UpdateCandidateProfileSchema } from './schemas/update-profile.schema';
import type { UpdateCandidateProfileDto } from './schemas/update-profile.schema';
import {
  ApiGetProfileDocs,
  ApiSetDefaultResumeDocs,
  ApiUpdateProfileDocs,
} from './docs/candidate-profile.swagger';

@Controller('candidate')
export class CandidateController {
  constructor(private readonly candidateService: CandidateService) {}

  @ApiGetProfileDocs()
  @Get('profile')
  getProfile(@CurrentUser() user: UserEntity) {
    return this.candidateService.getProfileByUserId(user.id);
  }

  @ApiUpdateProfileDocs()
  @Patch('profile')
  updateProfile(
    @CurrentUser() user: UserEntity,
    @ZodBody(UpdateCandidateProfileSchema) dto: UpdateCandidateProfileDto,
  ) {
    return this.candidateService.updateProfile(user.id, dto);
  }

  @ApiSetDefaultResumeDocs()
  @Patch('profile/default-resume')
  setDefaultResume(
    @CurrentUser() user: UserEntity,
    @ZodBody(SetDefaultResumeSchema) dto: SetDefaultResumeDto,
  ) {
    return this.candidateService.setDefaultResume(user.id, dto);
  }
}
