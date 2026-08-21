import { Injectable } from '@nestjs/common';
import { UserEntity } from './entities/user.entity';
import { UserRepository } from './repositories/user.repository';

@Injectable()
export class UsersService {
  constructor(private readonly userRepository: UserRepository) {}

  async findById(id: string): Promise<UserEntity | null> {
    return this.userRepository.findById(id);
  }

  async findByEmail(email: string): Promise<UserEntity | null> {
    return this.userRepository.findByEmail(email.toLowerCase().trim());
  }

  async existsByEmail(email: string): Promise<boolean> {
    const user = await this.userRepository.findByEmail(
      email.toLowerCase().trim(),
    );
    return user !== null;
  }

  async create(data: Partial<UserEntity>): Promise<UserEntity> {
    return this.userRepository.create({
      ...data,
      email: data.email!.toLowerCase().trim(),
    });
  }
}
