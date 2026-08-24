import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JobPreferencesEntity } from './entities/job-preferences.entity';
import { JobPreferencesRepository } from './repositories/job-preferences.repository';
import { JobPreferencesService } from './job-preferences.service';
import { JobPreferencesController } from './job-preferences.controller';

@Module({
  imports: [TypeOrmModule.forFeature([JobPreferencesEntity])],
  controllers: [JobPreferencesController],
  providers: [JobPreferencesService, JobPreferencesRepository],
  exports: [JobPreferencesService, JobPreferencesRepository],
})
export class JobPreferencesModule {}
