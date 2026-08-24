import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateCandidateProfiles1787308800000 implements MigrationInterface {
  name = 'CreateCandidateProfiles1787308800000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "candidate_profiles" (
        "id" uuid NOT NULL,
        "user_id" uuid NOT NULL,
        "headline" character varying(120),
        "professional_summary" text,
        "location" character varying(120),
        "phone" character varying(32),
        "linkedin_url" character varying(500),
        "github_url" character varying(500),
        "portfolio_url" character varying(500),
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_candidate_profiles_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_candidate_profiles_user_id" UNIQUE ("user_id"),
        CONSTRAINT "FK_candidate_profiles_user_id" FOREIGN KEY ("user_id")
          REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "candidate_profiles"`);
  }
}
