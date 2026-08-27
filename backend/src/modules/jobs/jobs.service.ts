import { Injectable, NotFoundException } from '@nestjs/common';
import { JobEntity } from './entities/job.entity';
import { JobsRepository } from './repositories/jobs.repository';
import type { JobListQuery } from './schemas/job-list.query.schema';

@Injectable()
export class JobsService {
  constructor(private readonly jobsRepository: JobsRepository) {}

  async list(query: JobListQuery): Promise<JobEntity[]> {
    return this.jobsRepository.findWithFilters({
      source: query.source,
      location: query.location,
      remoteType: query.remoteType,
      postedAfter: query.postedAfter ? new Date(query.postedAfter) : undefined,
      limit: query.limit,
    });
  }

  async getById(id: string): Promise<JobEntity> {
    const job = await this.jobsRepository.findById(id);
    if (!job) {
      throw new NotFoundException('Job not found');
    }
    return job;
  }
}
