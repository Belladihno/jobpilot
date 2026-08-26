import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateJobMatches1787913600000 implements MigrationInterface {
  name = 'CreateJobMatches1787913600000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "job_matches" (
        "id" uuid NOT NULL,
        "user_id" uuid NOT NULL,
        "job_id" uuid NOT NULL,
        "resume_id" uuid NOT NULL,
        "score" integer NOT NULL,
        "match_reasons" jsonb NOT NULL DEFAULT '[]',
        "missing_requirements" jsonb NOT NULL DEFAULT '[]',
        "status" varchar(16) NOT NULL DEFAULT 'NEW',
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_job_matches_id" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_job_matches_user_job" ON "job_matches" ("user_id", "job_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IX_job_matches_user_score" ON "job_matches" ("user_id", "score")`,
    );
    await queryRunner.query(`
      ALTER TABLE "job_matches"
      ADD CONSTRAINT "FK_job_matches_user" FOREIGN KEY ("user_id") REFERENCES "users"("id")
      ON DELETE CASCADE ON UPDATE NO ACTION
    `);
    await queryRunner.query(`
      ALTER TABLE "job_matches"
      ADD CONSTRAINT "FK_job_matches_job" FOREIGN KEY ("job_id") REFERENCES "jobs"("id")
      ON DELETE CASCADE ON UPDATE NO ACTION
    `);
    await queryRunner.query(`
      ALTER TABLE "job_matches"
      ADD CONSTRAINT "FK_job_matches_resume" FOREIGN KEY ("resume_id") REFERENCES "resumes"("id")
      ON DELETE CASCADE ON UPDATE NO ACTION
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "job_matches"`);
  }
}
