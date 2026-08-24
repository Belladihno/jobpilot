import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateResumes1787395200000 implements MigrationInterface {
  name = 'CreateResumes1787395200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."resumes_status_enum" AS ENUM('uploaded', 'processing', 'processed', 'failed')`,
    );
    await queryRunner.query(`
      CREATE TABLE "resumes" (
        "id" uuid NOT NULL,
        "user_id" uuid NOT NULL,
        "file_name" character varying(255) NOT NULL,
        "mime_type" character varying(100) NOT NULL,
        "file_size" integer NOT NULL,
        "storage_key" character varying(512) NOT NULL,
        "status" "public"."resumes_status_enum" NOT NULL DEFAULT 'uploaded',
        "extracted_text" text,
        "processing_error" text,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_resumes_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_resumes_user_id" FOREIGN KEY ("user_id")
          REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_resumes_user_id" ON "resumes" ("user_id")`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_resumes_storage_key" ON "resumes" ("storage_key")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "resumes"`);
    await queryRunner.query(
      `DROP TYPE IF EXISTS "public"."resumes_status_enum"`,
    );
  }
}
