import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JobMatchEntity } from './entities/job-match.entity';
import { JobEntity } from '../jobs/entities/job.entity';
import { JobsRepository } from '../jobs/repositories/jobs.repository';
import { JobMatchRepository } from './repositories/job-match.repository';
import { MatchingService } from './matching.service';
import { MatchesController } from './matches.controller';
import { JobPreferencesModule } from '../job-preferences/job-preferences.module';
import { CandidateModule } from '../candidate/candidate.module';
import { ResumesModule } from '../resumes/resumes.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([JobMatchEntity, JobEntity]),
    JobPreferencesModule,
    CandidateModule,
    ResumesModule,
  ],
  controllers: [MatchesController],
  // JobsRepository is provided here directly to avoid a circular
  // JobsModule <-> MatchingModule import.
  providers: [JobMatchRepository, JobsRepository, MatchingService],
  exports: [MatchingService],
})
export class MatchingModule {}
