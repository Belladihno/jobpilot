import {
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Express } from 'express';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ZodBody } from '../../common/decorators/zod-body.decorator';
import type { UserEntity } from '../users/entities/user.entity';
import { ResumesService } from './resumes.service';
import {
  ApiGetParsedDataDocs,
  ApiGetResumeDocs,
  ApiApproveResumeDocs,
  ApiListResumesDocs,
  ApiUpdateParsedDataDocs,
  ApiUploadResumeDocs,
} from './docs/resumes.swagger';
import { StructuredResumeSchema } from './schemas/structured-resume.schema';
import type { StructuredResume } from './schemas/structured-resume.schema';

const MISSING_FILE = {
  userId: '',
  fileName: '',
  mimeType: '',
  data: Buffer.alloc(0),
} as const;

@Controller('resumes')
export class ResumesController {
  constructor(private readonly resumesService: ResumesService) {}

  @ApiUploadResumeDocs()
  @Post()
  @UseInterceptors(FileInterceptor('file'))
  async upload(
    @CurrentUser() user: UserEntity,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.resumesService.upload(
      file
        ? {
            userId: user.id,
            fileName: file.originalname,
            mimeType: file.mimetype,
            data: file.buffer,
          }
        : { ...MISSING_FILE, userId: user.id },
    );
  }

  @ApiListResumesDocs()
  @Get()
  listMine(@CurrentUser() user: UserEntity) {
    return this.resumesService.listByUser(user.id);
  }

  @ApiGetResumeDocs()
  @Get(':id')
  async getOne(@CurrentUser() user: UserEntity, @Param('id') id: string) {
    return this.resumesService.getOwned(user.id, id);
  }

  @ApiGetParsedDataDocs()
  @Get(':id/parsed-data')
  getParsedData(@CurrentUser() user: UserEntity, @Param('id') id: string) {
    return this.resumesService.getParsedData(user.id, id);
  }

  @ApiUpdateParsedDataDocs()
  @Patch(':id/parsed-data')
  updateParsedData(
    @CurrentUser() user: UserEntity,
    @Param('id') id: string,
    @ZodBody(StructuredResumeSchema) dto: StructuredResume,
  ) {
    return this.resumesService.updateParsedData(user.id, id, dto);
  }

  @ApiApproveResumeDocs()
  @Post(':id/approve')
  approve(@CurrentUser() user: UserEntity, @Param('id') id: string) {
    return this.resumesService.approve(user.id, id);
  }
}
