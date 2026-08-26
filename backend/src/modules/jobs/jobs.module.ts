import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JobEntity } from './entities/job.entity';
import { JobsRepository } from './repositories/jobs.repository';
import { JobDiscoveryConsumer } from '../../workers/job-discovery/job-discovery.consumer';
import { DiscoveryScheduler } from '../../workers/job-discovery/discovery.scheduler';
import { MatchingModule } from '../matching/matching.module';

@Module({
  imports: [TypeOrmModule.forFeature([JobEntity]), MatchingModule],
  providers: [JobsRepository, JobDiscoveryConsumer, DiscoveryScheduler],
  exports: [JobsRepository],
})
export class JobsModule {}
