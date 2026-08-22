import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import { SessionEntity } from '../../modules/auth/entities/session.entity';
import { UserEntity } from '../../modules/users/entities/user.entity';
import { CreateUsersTable1787144227927 } from '../../../migrations/1787144227927-CreateUsersTable';
import { CreateSessionsTableAndAddedNameToUserEntityDateTables1787151177780 } from '../../../migrations/1787151177780-CreateSessionsTableAndAddedNameToUserEntityDateTables';
import { FixEmailVerifiedAtColumnTypo1787152000000 } from '../../../migrations/1787152000000-FixEmailVerifiedAtColumnTypo';
import { AddSessionsIndexes1787222400000 } from '../../../migrations/1787222400000-AddSessionsIndexes';

dotenv.config();

export const AppDataSource = new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  entities: [UserEntity, SessionEntity],
  migrations: [
    CreateUsersTable1787144227927,
    CreateSessionsTableAndAddedNameToUserEntityDateTables1787151177780,
    FixEmailVerifiedAtColumnTypo1787152000000,
    AddSessionsIndexes1787222400000,
  ],
  synchronize: false,
  ssl: false,
});
