import { applyDecorators } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiProperty,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { JobDto } from '../../jobs/docs/jobs.swagger';

export class MatchDto {
  @ApiProperty() id!: string;
  @ApiProperty() jobId!: string;
  @ApiProperty() resumeId!: string;
  @ApiProperty() score!: number;
  @ApiProperty({ type: [String] }) matchReasons!: string[];
  @ApiProperty({ type: [String] }) missingRequirements!: string[];
  @ApiProperty({ enum: ['NEW', 'INTERESTED', 'SAVED', 'DISMISSED', 'APPLIED'] })
  status!: string;
  @ApiProperty({ type: JobDto }) job!: JobDto;
}

export class UpdateMatchStatusBodyDto {
  @ApiProperty({ enum: ['INTERESTED', 'SAVED', 'DISMISSED', 'APPLIED'] })
  status!: string;
}

export const ApiListMatchesDocs = () =>
  applyDecorators(
    ApiOperation({
      summary: 'List own job matches',
      description:
        'Ranked by score descending. Filter by minimum score, feedback status or job source.',
    }),
    ApiOkResponse({ type: [MatchDto] }),
    ApiUnauthorizedResponse({ description: 'No session' }),
  );

export const ApiGetMatchDocs = () =>
  applyDecorators(
    ApiOperation({ summary: 'Get one match with score explanation' }),
    ApiOkResponse({ type: MatchDto }),
    ApiNotFoundResponse({ description: 'Match not found or not owned' }),
    ApiUnauthorizedResponse({ description: 'No session' }),
  );

export const ApiUpdateMatchStatusDocs = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Set feedback status on a match',
      description:
        'INTERESTED, SAVED, DISMISSED or APPLIED. Status survives later score recomputes.',
    }),
    ApiOkResponse({ type: MatchDto }),
    ApiBadRequestResponse({ description: 'Invalid status' }),
    ApiNotFoundResponse({ description: 'Match not found or not owned' }),
    ApiUnauthorizedResponse({ description: 'No session' }),
  );
