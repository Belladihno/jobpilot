import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateStructuredResumeTables1787481600000 implements MigrationInterface {
  name = 'CreateStructuredResumeTables1787481600000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "resume_skills" (
        "id" uuid NOT NULL,
        "resume_id" uuid NOT NULL,
        "name" character varying(120) NOT NULL,
        "level" character varying(40),
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_resume_skills_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_resume_skills_resume_id" FOREIGN KEY ("resume_id")
          REFERENCES "resumes"("id") ON DELETE CASCADE ON UPDATE NO ACTION
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_resume_skills_resume_id" ON "resume_skills" ("resume_id")`,
    );

    await queryRunner.query(`
      CREATE TABLE "resume_experiences" (
        "id" uuid NOT NULL,
        "resume_id" uuid NOT NULL,
        "company" character varying(120) NOT NULL,
        "title" character varying(120) NOT NULL,
        "start_date" character varying(20),
        "end_date" character varying(20),
        "description" character varying(1000),
        "achievements" jsonb NOT NULL DEFAULT '[]',
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_resume_experiences_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_resume_experiences_resume_id" FOREIGN KEY ("resume_id")
          REFERENCES "resumes"("id") ON DELETE CASCADE ON UPDATE NO ACTION
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_resume_experience_resume_id" ON "resume_experiences" ("resume_id")`,
    );

    await queryRunner.query(`
      CREATE TABLE "resume_educations" (
        "id" uuid NOT NULL,
        "resume_id" uuid NOT NULL,
        "institution" character varying(150) NOT NULL,
        "degree" character varying(120) NOT NULL,
        "field" character varying(120),
        "start_year" integer,
        "end_year" integer,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_resume_educations_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_resume_educations_resume_id" FOREIGN KEY ("resume_id")
          REFERENCES "resumes"("id") ON DELETE CASCADE ON UPDATE NO ACTION
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_resume_education_resume_id" ON "resume_educations" ("resume_id")`,
    );

    await queryRunner.query(`
      CREATE TABLE "resume_projects" (
        "id" uuid NOT NULL,
        "resume_id" uuid NOT NULL,
        "name" character varying(120) NOT NULL,
        "description" character varying(1000),
        "technologies" jsonb NOT NULL DEFAULT '[]',
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_resume_projects_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_resume_projects_resume_id" FOREIGN KEY ("resume_id")
          REFERENCES "resumes"("id") ON DELETE CASCADE ON UPDATE NO ACTION
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_resume_projects_resume_id" ON "resume_projects" ("resume_id")`,
    );

    await queryRunner.query(`
      CREATE TABLE "resume_certifications" (
        "id" uuid NOT NULL,
        "resume_id" uuid NOT NULL,
        "name" character varying(150) NOT NULL,
        "issuer" character varying(120),
        "issued_at" character varying(20),
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_resume_certifications_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_resume_certifications_resume_id" FOREIGN KEY ("resume_id")
          REFERENCES "resumes"("id") ON DELETE CASCADE ON UPDATE NO ACTION
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_resume_certifications_resume_id" ON "resume_certifications" ("resume_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "resume_certifications"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "resume_projects"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "resume_educations"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "resume_experiences"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "resume_skills"`);
  }
}
