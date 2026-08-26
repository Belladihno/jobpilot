import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Not, Repository } from 'typeorm';
import { CandidateProfileEntity } from '../entities/candidate-profile.entity';

@Injectable()
export class CandidateProfileRepository {
  constructor(
    @InjectRepository(CandidateProfileEntity)
    private readonly repo: Repository<CandidateProfileEntity>,
  ) {}

  async findByUserId(userId: string): Promise<CandidateProfileEntity | null> {
    return this.repo.findOne({ where: { userId } });
  }

  /** Users who designated an active/default resume — matching candidates. */
  async findWithDefaultResume(): Promise<CandidateProfileEntity[]> {
    return this.repo.find({
      where: { defaultResumeId: Not(IsNull()) },
    });
  }

  async createBlankForUser(userId: string): Promise<CandidateProfileEntity> {
    const profile = this.repo.create({ userId });
    return this.repo.save(profile);
  }

  async save(profile: CandidateProfileEntity): Promise<CandidateProfileEntity> {
    return this.repo.save(profile);
  }
}
