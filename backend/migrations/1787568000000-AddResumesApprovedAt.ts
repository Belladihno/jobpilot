import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddResumesApprovedAt1787568000000 implements MigrationInterface {
  name = 'AddResumesApprovedAt1787568000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "resumes" ADD "approved_at" TIMESTAMP WITH TIME ZONE`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "resumes" DROP COLUMN IF EXISTS "approved_at"`,
    );
  }
}
