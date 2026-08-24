import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ResumeEntity } from './entities/resume.entity';
import { ResumeRepository } from './repositories/resume.repository';
import { ResumesService } from './resumes.service';
import { ResumesController } from './resumes.controller';
import { ResumeProcessingConsumer } from '../../workers/resume-processing/resume-processing.consumer';
import { ResumeParserRegistry } from '../../workers/resume-processing/resume-parser.registry';
import { PdfResumeParser } from '../../workers/resume-processing/parsers/pdf.parser';
import { DocxResumeParser } from '../../workers/resume-processing/parsers/docx.parser';
import { StorageModule } from '../../infrastructure/storage/storage.module';

@Module({
  imports: [TypeOrmModule.forFeature([ResumeEntity]), StorageModule],
  controllers: [ResumesController],
  providers: [
    ResumeRepository,
    ResumesService,
    ResumeParserRegistry,
    PdfResumeParser,
    DocxResumeParser,
    ResumeProcessingConsumer,
  ],
  exports: [ResumesService],
})
export class ResumesModule {}
