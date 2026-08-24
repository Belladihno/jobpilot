import {
  Controller,
  Get,
  Param,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Express } from 'express';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { UserEntity } from '../users/entities/user.entity';
import { ResumesService } from './resumes.service';
import {
  ApiGetResumeDocs,
  ApiListResumesDocs,
  ApiUploadResumeDocs,
} from './docs/resumes.swagger';

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
}
