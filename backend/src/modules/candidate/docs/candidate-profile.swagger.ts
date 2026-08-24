import { applyDecorators } from '@nestjs/common';
import {
  ApiOkResponse,
  ApiOperation,
  ApiProperty,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

export class CandidateProfileDto {
  @ApiProperty() id!: string;
  @ApiProperty() userId!: string;
  @ApiProperty({ nullable: true }) headline!: string | null;
  @ApiProperty({ nullable: true }) professionalSummary!: string | null;
  @ApiProperty({ nullable: true }) location!: string | null;
  @ApiProperty({ nullable: true }) phone!: string | null;
  @ApiProperty({ nullable: true }) linkedinUrl!: string | null;
  @ApiProperty({ nullable: true }) githubUrl!: string | null;
  @ApiProperty({ nullable: true }) portfolioUrl!: string | null;
}

export const ApiGetProfileDocs = () =>
  applyDecorators(
    ApiOperation({ summary: 'Get own candidate profile' }),
    ApiOkResponse({ type: CandidateProfileDto }),
    ApiUnauthorizedResponse({ description: 'No session' }),
  );

export const ApiUpdateProfileDocs = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Update own candidate profile',
      description: 'Partial update; empty strings clear the field',
    }),
    ApiOkResponse({ type: CandidateProfileDto }),
    ApiUnauthorizedResponse({ description: 'No session' }),
  );
