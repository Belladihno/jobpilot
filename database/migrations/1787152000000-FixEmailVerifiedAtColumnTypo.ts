import { MigrationInterface, QueryRunner } from 'typeorm';

export class FixEmailVerifiedAtColumnTypo1787152000000 implements MigrationInterface {
  name = 'FixEmailVerifiedAtColumnTypo1787152000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const hasTypo = await queryRunner.hasColumn('users', 'enail_verified_at');
    if (hasTypo) {
      await queryRunner.renameColumn(
        'users',
        'enail_verified_at',
        'email_verified_at',
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const hasCorrect = await queryRunner.hasColumn(
      'users',
      'email_verified_at',
    );
    if (hasCorrect) {
      await queryRunner.renameColumn(
        'users',
        'email_verified_at',
        'enail_verified_at',
      );
    }
  }
}
