import { applyDecorators } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiOkResponse,
  ApiOperation,
  ApiProperty,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

export class JobPreferencesDto {
  @ApiProperty() id!: string;
  @ApiProperty() userId!: string;
  @ApiProperty({ type: [String] }) jobTitles!: string[];
  @ApiProperty({ type: [String] }) locations!: string[];
  @ApiProperty({ enum: ['REMOTE', 'HYBRID', 'ONSITE', 'ANY'] })
  remotePreference!: string;
  @ApiProperty({
    type: [String],
    enum: ['FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERNSHIP', 'TEMPORARY'],
  })
  employmentTypes!: string[];
  @ApiProperty({ nullable: true, type: Number }) salaryMin!: number | null;
  @ApiProperty({ nullable: true }) salaryCurrency!: string | null;
  @ApiProperty({ type: [String] }) excludedKeywords!: string[];
  @ApiProperty({ type: [String] }) requiredKeywords!: string[];
  @ApiProperty({ type: [String], enum: ['JUNIOR', 'MID', 'SENIOR', 'LEAD'] })
  experienceLevels!: string[];
  @ApiProperty() autoApplyEnabled!: boolean;
  @ApiProperty() minimumMatchScore!: number;
}

export const ApiGetPreferencesDocs = () =>
  applyDecorators(
    ApiOperation({ summary: 'Get own job preferences' }),
    ApiOkResponse({ type: JobPreferencesDto }),
    ApiUnauthorizedResponse({ description: 'No session' }),
  );

export const ApiUpdatePreferencesDocs = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Update own job preferences',
      description:
        'Partial update. Array fields are replaced wholesale; salaryMin/salaryCurrency accept null to clear.',
    }),
    ApiOkResponse({ type: JobPreferencesDto }),
    ApiBadRequestResponse({ description: 'Validation failed' }),
    ApiUnauthorizedResponse({ description: 'No session' }),
  );
