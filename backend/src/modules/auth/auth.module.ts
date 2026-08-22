import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { PasswordService } from './password.service';
import { SessionsCleanupService } from './sessions-cleanup.service';
import { SessionRepository } from './repositories/session.repository';
import { SessionEntity } from './entities/session.entity';
import { AuthenticationGuard } from '../../common/guards/authentication.guard';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [TypeOrmModule.forFeature([SessionEntity]), UsersModule],
  controllers: [AuthController],
  providers: [
    AuthService,
    PasswordService,
    SessionRepository,
    AuthenticationGuard,
    SessionsCleanupService,
  ],
  exports: [AuthService, AuthenticationGuard],
})
export class AuthModule {}
