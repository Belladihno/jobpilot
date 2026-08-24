import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddDefaultResumeToCandidateProfiles1787654400000 implements MigrationInterface {
  name = 'AddDefaultResumeToCandidateProfiles1787654400000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "candidate_profiles" ADD "default_resume_id" uuid`,
    );
    await queryRunner.query(`
      ALTER TABLE "candidate_profiles" ADD CONSTRAINT "FK_candidate_profiles_default_resume"
      FOREIGN KEY ("default_resume_id") REFERENCES "resumes"("id")
      ON DELETE SET NULL ON UPDATE NO ACTION
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "candidate_profiles" DROP CONSTRAINT IF EXISTS "FK_candidate_profiles_default_resume"`,
    );
    await queryRunner.query(
      `ALTER TABLE "candidate_profiles" DROP COLUMN IF EXISTS "default_resume_id"`,
    );
  }
}
