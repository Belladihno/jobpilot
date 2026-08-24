import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateJobPreferences1787740800000 implements MigrationInterface {
  name = 'CreateJobPreferences1787740800000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "job_preferences" (
        "id" uuid NOT NULL,
        "user_id" uuid NOT NULL,
        "job_titles" jsonb NOT NULL DEFAULT '[]',
        "locations" jsonb NOT NULL DEFAULT '[]',
        "remote_preference" varchar(16) NOT NULL DEFAULT 'ANY',
        "employment_types" jsonb NOT NULL DEFAULT '[]',
        "salary_min" integer,
        "salary_currency" varchar(3),
        "excluded_keywords" jsonb NOT NULL DEFAULT '[]',
        "required_keywords" jsonb NOT NULL DEFAULT '[]',
        "experience_levels" jsonb NOT NULL DEFAULT '[]',
        "auto_apply_enabled" boolean NOT NULL DEFAULT false,
        "minimum_match_score" integer NOT NULL DEFAULT 60,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_job_preferences" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(
      `ALTER TABLE "job_preferences" ADD CONSTRAINT "UQ_job_preferences_user_id" UNIQUE ("user_id")`,
    );
    await queryRunner.query(`
      ALTER TABLE "job_preferences"
      ADD CONSTRAINT "FK_job_preferences_user"
      FOREIGN KEY ("user_id") REFERENCES "users"("id")
      ON DELETE CASCADE ON UPDATE NO ACTION
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "job_preferences"`);
  }
}
