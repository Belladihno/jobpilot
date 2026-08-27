import { applyDecorators } from '@nestjs/common';
import {
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiProperty,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

export class JobDto {
  @ApiProperty() id!: string;
  @ApiProperty() source!: string;
  @ApiProperty() externalId!: string;
  @ApiProperty() title!: string;
  @ApiProperty() company!: string;
  @ApiProperty() description!: string;
  @ApiProperty() location!: string;
  @ApiProperty({ enum: ['REMOTE', 'HYBRID', 'ONSITE', 'UNKNOWN'] })
  remoteType!: string;
  @ApiProperty()
  employmentType!: string;
  @ApiProperty()
  experienceLevel!: string;
  @ApiProperty({ nullable: true, type: Number }) salaryMin!: number | null;
  @ApiProperty({ nullable: true, type: Number }) salaryMax!: number | null;
  @ApiProperty({ nullable: true }) salaryCurrency!: string | null;
  @ApiProperty() applicationUrl!: string;
  @ApiProperty({ nullable: true, type: String }) postedAt!: string | null;
}

export const ApiListJobsDocs = () =>
  applyDecorators(
    ApiOperation({
      summary: 'List discovered jobs',
      description:
        'Filter by source, location substring, remote type and posted-after date. Newest discovered first.',
    }),
    ApiOkResponse({ type: [JobDto] }),
    ApiUnauthorizedResponse({ description: 'No session' }),
  );

export const ApiGetJobDocs = () =>
  applyDecorators(
    ApiOperation({ summary: 'Get a single job posting' }),
    ApiOkResponse({ type: JobDto }),
    ApiNotFoundResponse({ description: 'Job not found' }),
    ApiUnauthorizedResponse({ description: 'No session' }),
  );
