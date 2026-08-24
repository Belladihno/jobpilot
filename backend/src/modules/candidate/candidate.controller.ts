import { Controller, Get, Patch } from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ZodBody } from '../../common/decorators/zod-body.decorator';
import type { UserEntity } from '../users/entities/user.entity';
import { CandidateService } from './candidate.service';
import { UpdateCandidateProfileSchema } from './schemas/update-profile.schema';
import type { UpdateCandidateProfileDto } from './schemas/update-profile.schema';
import {
  ApiGetProfileDocs,
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
}
