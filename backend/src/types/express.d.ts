import type { SessionEntity } from '../modules/auth/entities/session.entity';
import type { UserEntity } from '../modules/users/entities/user.entity';

declare global {
  namespace Express {
    interface Request {
      user?: UserEntity;
      session?: SessionEntity;
      correlationId?: string;
    }
  }
}

export {};
