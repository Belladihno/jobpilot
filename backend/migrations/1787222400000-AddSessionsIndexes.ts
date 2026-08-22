import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSessionsIndexes1787222400000 implements MigrationInterface {
  name = 'AddSessionsIndexes1787222400000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "IDX_sessions_token_hash" ON "sessions" ("tokenHash")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_sessions_user_id" ON "sessions" ("userId")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_sessions_user_id"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_sessions_token_hash"`);
  }
}
