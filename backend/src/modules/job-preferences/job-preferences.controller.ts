import { Controller, Get, Patch } from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ZodBody } from '../../common/decorators/zod-body.decorator';
import type { UserEntity } from '../users/entities/user.entity';
import { JobPreferencesService } from './job-preferences.service';
import { UpdateJobPreferencesSchema } from './schemas/update-job-preferences.schema';
import type { UpdateJobPreferencesDto } from './schemas/update-job-preferences.schema';
import {
  ApiGetPreferencesDocs,
  ApiUpdatePreferencesDocs,
} from './docs/job-preferences.swagger';

@Controller('job-preferences')
export class JobPreferencesController {
  constructor(private readonly preferencesService: JobPreferencesService) {}

  @ApiGetPreferencesDocs()
  @Get()
  getPreferences(@CurrentUser() user: UserEntity) {
    return this.preferencesService.getPreferencesByUserId(user.id);
  }

  @ApiUpdatePreferencesDocs()
  @Patch()
  updatePreferences(
    @CurrentUser() user: UserEntity,
    @ZodBody(UpdateJobPreferencesSchema) dto: UpdateJobPreferencesDto,
  ) {
    return this.preferencesService.updatePreferences(user.id, dto);
  }
}
