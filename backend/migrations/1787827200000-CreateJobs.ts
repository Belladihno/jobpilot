import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateJobs1787827200000 implements MigrationInterface {
  name = 'CreateJobs1787827200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "jobs" (
        "id" uuid NOT NULL,
        "source" varchar(40) NOT NULL,
        "external_id" varchar(200) NOT NULL,
        "title" varchar(200) NOT NULL,
        "company" varchar(200) NOT NULL,
        "description" text NOT NULL,
        "location" varchar(200) NOT NULL,
        "remote_type" varchar(16) NOT NULL,
        "employment_type" varchar(16) NOT NULL,
        "experience_level" varchar(16) NOT NULL,
        "salary_min" integer,
        "salary_max" integer,
        "salary_currency" varchar(3),
        "application_url" varchar(1000) NOT NULL,
        "posted_at" TIMESTAMP WITH TIME ZONE,
        "expires_at" TIMESTAMP WITH TIME ZONE,
        "discovered_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_jobs_id" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_jobs_source_external_id" ON "jobs" ("source", "external_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IX_jobs_discovered_at" ON "jobs" ("discovered_at")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "jobs"`);
  }
}
