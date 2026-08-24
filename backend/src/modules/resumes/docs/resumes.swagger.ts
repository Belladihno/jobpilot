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
