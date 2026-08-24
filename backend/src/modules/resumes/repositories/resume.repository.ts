import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ResumeEntity } from '../entities/resume.entity';

@Injectable()
export class ResumeRepository {
  constructor(
    @InjectRepository(ResumeEntity)
    private readonly repo: Repository<ResumeEntity>,
  ) {}

  async create(data: Partial<ResumeEntity>): Promise<ResumeEntity> {
    const resume = this.repo.create(data);
    return this.repo.save(resume);
  }

  async findById(id: string): Promise<ResumeEntity | null> {
    return this.repo.findOne({ where: { id } });
  }

  async findByUserId(userId: string): Promise<ResumeEntity[]> {
    return this.repo.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }

  async save(resume: ResumeEntity): Promise<ResumeEntity> {
    return this.repo.save(resume);
  }

  async remove(resume: ResumeEntity): Promise<void> {
    await this.repo.remove(resume);
  }
}
