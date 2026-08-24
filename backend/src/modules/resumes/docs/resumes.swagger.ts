import { applyDecorators } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBody,
  ApiConsumes,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiPayloadTooLargeResponse,
  ApiProperty,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

export class ResumeDto {
  @ApiProperty() id!: string;
  @ApiProperty() fileName!: string;
  @ApiProperty() mimeType!: string;
  @ApiProperty() fileSize!: number;
  @ApiProperty({ enum: ['uploaded', 'processing', 'processed', 'failed'] })
  status!: string;
  @ApiProperty({ nullable: true }) approvedAt!: string | null;
}

export class SkillDto {
  @ApiProperty() name!: string;
  @ApiProperty({ required: false }) level?: string;
}
export class ExperienceDto {
  @ApiProperty() company!: string;
  @ApiProperty() title!: string;
  @ApiProperty({ required: false }) startDate?: string;
  @ApiProperty({ nullable: true, required: false }) endDate?: string | null;
  @ApiProperty({ type: [String] }) bullets!: string[];
}
export class EducationDto {
  @ApiProperty() institution!: string;
  @ApiProperty() degree!: string;
  @ApiProperty({ nullable: true, required: false }) field?: string | null;
  @ApiProperty({ required: false }) startYear?: number;
  @ApiProperty({ nullable: true, required: false }) endYear?: number | null;
}
export class CertificationDto {
  @ApiProperty() name!: string;
  @ApiProperty({ nullable: true, required: false }) issuer?: string | null;
  @ApiProperty({ nullable: true, required: false }) issuedAt?: string | null;
}
export class ProjectDto {
  @ApiProperty() name!: string;
  @ApiProperty({ nullable: true, required: false }) description?: string | null;
  @ApiProperty({ type: [String] }) technologies!: string[];
}
export class ParsedDataDto {
  @ApiProperty({ type: [SkillDto] }) skills!: SkillDto[];
  @ApiProperty({ type: [ExperienceDto] }) experience!: ExperienceDto[];
  @ApiProperty({ type: [EducationDto] }) education!: EducationDto[];
  @ApiProperty({ type: [CertificationDto] })
  certifications!: CertificationDto[];
  @ApiProperty({ type: [ProjectDto] }) projects!: ProjectDto[];
}

export const ApiUploadResumeDocs = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Upload a resume (PDF or DOCX, max 10MB)',
      description:
        'Stores the file and queues async processing. Returns immediately with status "uploaded".',
    }),
    ApiConsumes('multipart/form-data'),
    ApiBody({
      schema: {
        type: 'object',
        properties: { file: { type: 'string', format: 'binary' } },
        required: ['file'],
      },
    }),
    ApiCreatedResponse({ type: ResumeDto }),
    ApiBadRequestResponse({ description: 'Missing/unsupported/empty file' }),
    ApiPayloadTooLargeResponse({ description: 'File exceeds 10MB' }),
    ApiUnauthorizedResponse({ description: 'No session' }),
  );

export const ApiListResumesDocs = () =>
  applyDecorators(
    ApiOperation({ summary: 'List own resumes (newest first)' }),
    ApiOkResponse({ type: [ResumeDto] }),
    ApiUnauthorizedResponse({ description: 'No session' }),
  );

export const ApiGetResumeDocs = () =>
  applyDecorators(
    ApiOperation({ summary: 'Get one own resume by id' }),
    ApiOkResponse({ type: ResumeDto }),
    ApiNotFoundResponse({ description: 'Resume not found or not owned' }),
    ApiUnauthorizedResponse({ description: 'No session' }),
  );

export const ApiGetParsedDataDocs = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Get structured parsed data for a resume',
    }),
    ApiOkResponse({ type: ParsedDataDto }),
    ApiNotFoundResponse({ description: 'Resume not found or not owned' }),
    ApiUnauthorizedResponse({ description: 'No session' }),
  );

export const ApiUpdateParsedDataDocs = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Replace structured parsed data (user corrections)',
      description:
        'Full-document replace. Only allowed while the resume status is "processed".',
    }),
    ApiBody({ type: ParsedDataDto }),
    ApiOkResponse({ type: ParsedDataDto }),
    ApiBadRequestResponse({ description: 'Validation failed or wrong status' }),
    ApiNotFoundResponse({ description: 'Resume not found or not owned' }),
    ApiUnauthorizedResponse({ description: 'No session' }),
  );

export const ApiApproveResumeDocs = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Approve parsed data',
      description: 'Sets approved_at; approved data drives Phase 3 matching.',
    }),
    ApiOkResponse({ type: ResumeDto }),
    ApiBadRequestResponse({
      description: 'Only processed resumes can be approved',
    }),
    ApiNotFoundResponse({ description: 'Resume not found or not owned' }),
    ApiUnauthorizedResponse({ description: 'No session' }),
  );
