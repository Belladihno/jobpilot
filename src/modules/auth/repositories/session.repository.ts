import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SessionEntity } from '../entities/session.entity';

@Injectable()
export class SessionRepository {
  constructor(
    @InjectRepository(SessionEntity)
    private readonly repo: Repository<SessionEntity>,
  ) {}

  async create(data: Partial<SessionEntity>): Promise<SessionEntity> {
    const session = this.repo.create(data);
    return this.repo.save(session);
  }

  async findByTokenHash(tokenHash: string): Promise<SessionEntity | null> {
    return this.repo.findOne({
      where: { tokenHash },
      relations: { user: true },
    });
  }

  async revokeById(id: string): Promise<void> {
    await this.repo.update(id, { revokedAt: new Date() });
  }

  async revokeAllByUserId(userId: string): Promise<void> {
    await this.repo.update({ userId }, { revokedAt: new Date() });
  }

  async updateLastUsed(id: string): Promise<void> {
    await this.repo.update(id, { lastUsedAt: new Date() });
  }
}
