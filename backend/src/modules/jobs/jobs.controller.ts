import { Controller, Get, Param, ParseUUIDPipe } from '@nestjs/common';
import { JobsService } from './jobs.service';
import { JobListQuerySchema } from './schemas/job-list.query.schema';
import type { JobListQuery } from './schemas/job-list.query.schema';
import { ZodQuery } from '../../common/decorators/zod-query.decorator';
import { ApiListJobsDocs, ApiGetJobDocs } from './docs/jobs.swagger';

@Controller('jobs')
export class JobsController {
  constructor(private readonly jobsService: JobsService) {}

  @ApiListJobsDocs()
  @Get()
  list(@ZodQuery(JobListQuerySchema) query: JobListQuery) {
    return this.jobsService.list(query);
  }

  @ApiGetJobDocs()
  @Get(':id')
  getOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.jobsService.getById(id);
  }
}
