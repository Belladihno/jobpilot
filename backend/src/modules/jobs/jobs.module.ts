import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JobEntity } from './entities/job.entity';
import { JobsRepository } from './repositories/jobs.repository';
import { JobsService } from './jobs.service';
import { JobsController } from './jobs.controller';
import { JobDiscoveryConsumer } from '../../workers/job-discovery/job-discovery.consumer';
import { DiscoveryScheduler } from '../../workers/job-discovery/discovery.scheduler';
import { MatchingModule } from '../matching/matching.module';

@Module({
  imports: [TypeOrmModule.forFeature([JobEntity]), MatchingModule],
  controllers: [JobsController],
  providers: [
    JobsRepository,
    JobsService,
    JobDiscoveryConsumer,
    DiscoveryScheduler,
  ],
  exports: [JobsRepository, JobsService],
})
export class JobsModule {}
