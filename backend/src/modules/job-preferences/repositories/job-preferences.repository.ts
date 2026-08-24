import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JobPreferencesEntity } from '../entities/job-preferences.entity';

@Injectable()
export class JobPreferencesRepository {
  constructor(
    @InjectRepository(JobPreferencesEntity)
    private readonly repo: Repository<JobPreferencesEntity>,
  ) {}

  async findByUserId(userId: string): Promise<JobPreferencesEntity | null> {
    return this.repo.findOne({ where: { userId } });
  }

  async createBlankForUser(userId: string): Promise<JobPreferencesEntity> {
    const preferences = this.repo.create({ userId });
    return this.repo.save(preferences);
  }

  async save(preferences: JobPreferencesEntity): Promise<JobPreferencesEntity> {
    return this.repo.save(preferences);
  }
}
