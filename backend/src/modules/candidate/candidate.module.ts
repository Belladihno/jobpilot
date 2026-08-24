import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CandidateProfileEntity } from './entities/candidate-profile.entity';
import { CandidateProfileRepository } from './repositories/candidate-profile.repository';
import { CandidateService } from './candidate.service';
import { CandidateController } from './candidate.controller';

@Module({
  imports: [TypeOrmModule.forFeature([CandidateProfileEntity])],
  controllers: [CandidateController],
  providers: [CandidateService, CandidateProfileRepository],
  exports: [CandidateService, CandidateProfileRepository],
})
export class CandidateModule {}
