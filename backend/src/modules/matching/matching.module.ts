import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JobMatchEntity } from './entities/job-match.entity';
import { JobMatchRepository } from './repositories/job-match.repository';
import { MatchingService } from './matching.service';
import { JobPreferencesModule } from '../job-preferences/job-preferences.module';
import { CandidateModule } from '../candidate/candidate.module';
import { ResumesModule } from '../resumes/resumes.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([JobMatchEntity]),
    JobPreferencesModule,
    CandidateModule,
    ResumesModule,
  ],
  providers: [JobMatchRepository, MatchingService],
  exports: [MatchingService],
})
export class MatchingModule {}
