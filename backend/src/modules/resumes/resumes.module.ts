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
import { AiModule } from '../../infrastructure/ai/ai.module';
import { StructuredResumeRepository } from './repositories/structured-resume.repository';

@Module({
  imports: [TypeOrmModule.forFeature([ResumeEntity]), StorageModule, AiModule],
  controllers: [ResumesController],
  providers: [
    ResumeRepository,
    ResumesService,
    ResumeParserRegistry,
    PdfResumeParser,
    DocxResumeParser,
    StructuredResumeRepository,
    ResumeProcessingConsumer,
  ],
  exports: [ResumesService],
})
export class ResumesModule {}
