import { MigrationInterface, QueryRunner } from "typeorm";

export class InitialSchema1778432160826 implements MigrationInterface {
    name = 'InitialSchema1778432160826'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "performer_stats" ("id" SERIAL NOT NULL, "user_id" integer NOT NULL, "completed_tasks" integer NOT NULL DEFAULT '0', "avg_rating" double precision NOT NULL DEFAULT '0', "success_rate" double precision NOT NULL DEFAULT '0', "total_earnings" double precision NOT NULL DEFAULT '0', "response_time" integer, CONSTRAINT "UQ_16edbf6bf408fcd9c692773e5e8" UNIQUE ("user_id"), CONSTRAINT "REL_16edbf6bf408fcd9c692773e5e" UNIQUE ("user_id"), CONSTRAINT "PK_cc76674dd2c277ae559420cff46" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "requester_stats" ("id" SERIAL NOT NULL, "user_id" integer NOT NULL, "tasks_posted" integer NOT NULL DEFAULT '0', "tasks_verified" integer NOT NULL DEFAULT '0', "total_spent" double precision NOT NULL DEFAULT '0', CONSTRAINT "UQ_af2652d0aaa9f7749a766e506c4" UNIQUE ("user_id"), CONSTRAINT "REL_af2652d0aaa9f7749a766e506c" UNIQUE ("user_id"), CONSTRAINT "PK_f35a8af4f891b0357501ec7c86a" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."identity_verifications_status_enum" AS ENUM('PENDING', 'APPROVED', 'REJECTED')`);
        await queryRunner.query(`CREATE TABLE "identity_verifications" ("id" SERIAL NOT NULL, "id_card_url" character varying, "selfie_url" character varying, "status" "public"."identity_verifications_status_enum" NOT NULL DEFAULT 'PENDING', "rejection_reason" text, "reviewed_by" integer, "reviewed_at" TIMESTAMP, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "user_id" integer, CONSTRAINT "PK_42a93e679bc1d9568b6e80ea080" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."users_current_role_enum" AS ENUM('REQUESTER', 'PERFORMER', 'ADMIN')`);
        await queryRunner.query(`CREATE TYPE "public"."users_status_enum" AS ENUM('active', 'banned')`);
        await queryRunner.query(`CREATE TABLE "users" ("id" SERIAL NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "FullName" character varying NOT NULL, "email" character varying NOT NULL, "password" character varying NOT NULL, "phone" character varying, "profile_image" character varying, "phone_verified" boolean NOT NULL DEFAULT false, "is_identity_verified" boolean NOT NULL DEFAULT false, "is_verified" boolean NOT NULL DEFAULT false, "is_performer" boolean NOT NULL DEFAULT false, "current_role" "public"."users_current_role_enum" NOT NULL DEFAULT 'REQUESTER', "status" "public"."users_status_enum" NOT NULL DEFAULT 'active', "bio" character varying, "city" character varying, "country" character varying, "location_text" character varying, "latitude" double precision, "longitude" double precision, "refresh_token" text, "otp" character varying, "otp_expiry" TIMESTAMP, "deleted_at" TIMESTAMP, "performerStatsId" integer, "requesterStatsId" integer, CONSTRAINT "UQ_97672ac88f789774dd47f7c8be3" UNIQUE ("email"), CONSTRAINT "REL_d935fed11c5e7329d936df2796" UNIQUE ("performerStatsId"), CONSTRAINT "REL_2e05454716cc09653052d3b054" UNIQUE ("requesterStatsId"), CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "messages" ("id" SERIAL NOT NULL, "conversation_id" integer NOT NULL, "sender_id" integer NOT NULL, "message" text NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_18325f38ae6de43878487eff986" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "conversations" ("id" SERIAL NOT NULL, "task_id" integer NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_ee34f4f7ced4ec8681f26bf04ef" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "categories" ("id" SERIAL NOT NULL, "name" character varying NOT NULL, "description" character varying, CONSTRAINT "UQ_8b0be371d28245da6e4f4b61878" UNIQUE ("name"), CONSTRAINT "PK_24dbc6126a28ff948da33e97d3b" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "task_categories" ("id" SERIAL NOT NULL, "task_id" integer NOT NULL, "category_id" integer NOT NULL, CONSTRAINT "UQ_6102b120e4b7cace4607e857094" UNIQUE ("task_id", "category_id"), CONSTRAINT "PK_40776b70c03a33e93c8c0165f87" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."tasks_status_enum" AS ENUM('POSTED', 'IN_PROGRESS', 'PARTIAL_COMPLETED', 'COMPLETED', 'VERIFIED', 'CANCELLED')`);
        await queryRunner.query(`CREATE TABLE "tasks" ("id" SERIAL NOT NULL, "title" character varying NOT NULL, "description" text, "requester_id" integer NOT NULL, "price" double precision NOT NULL, "deadline" TIMESTAMP NOT NULL, "required_workers" integer NOT NULL DEFAULT '1', "status" "public"."tasks_status_enum" NOT NULL DEFAULT 'POSTED', "location_text" character varying, "latitude" double precision, "longitude" double precision, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_8d12ff38fcc62aaba2cab748772" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."task-applications_status_enum" AS ENUM('PENDING', 'ACCEPTED', 'REJECTED', 'CANCELLED')`);
        await queryRunner.query(`CREATE TABLE "task-applications" ("id" SERIAL NOT NULL, "task_id" integer NOT NULL, "performer_id" integer NOT NULL, "status" "public"."task-applications_status_enum" NOT NULL DEFAULT 'PENDING', "offered_price" double precision NOT NULL, "applied_at" TIMESTAMP NOT NULL DEFAULT now(), "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_6bffbbbefbd49d4b38971fd0b68" UNIQUE ("task_id", "performer_id"), CONSTRAINT "PK_2c680d35af5a146917e5866d0b2" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."task-assignments_status_enum" AS ENUM('ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'VERIFIED', 'CANCELLED')`);
        await queryRunner.query(`CREATE TABLE "task-assignments" ("id" SERIAL NOT NULL, "task_id" integer NOT NULL, "performer_id" integer NOT NULL, "application_id" integer NOT NULL, "accepted_price" double precision NOT NULL, "status" "public"."task-assignments_status_enum" NOT NULL DEFAULT 'IN_PROGRESS', "is_verified" boolean NOT NULL DEFAULT false, "verified_at" TIMESTAMP, "cancelled_by" integer, "cancel_reason" character varying, "cancelled_at" TIMESTAMP, "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_39c3cd40505a57d6eb8c9c78149" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "reviews" ("id" SERIAL NOT NULL, "assignment_id" integer NOT NULL, "reviewer_id" integer NOT NULL, "reviewee_id" integer NOT NULL, "rating" integer NOT NULL, "reliability" integer NOT NULL, "speed" integer NOT NULL, "communication" integer NOT NULL, "accuracy" integer NOT NULL, "comment" character varying NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_d27a79b26ffcfbf4fc314bf7675" UNIQUE ("assignment_id"), CONSTRAINT "PK_231ae565c273ee700b283f15c1d" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."task_proofs_type_enum" AS ENUM('IMAGE', 'TEXT', 'RECEIPT', 'LOCATION')`);
        await queryRunner.query(`CREATE TYPE "public"."task_proofs_status_enum" AS ENUM('PENDING', 'APPROVED', 'REJECTED')`);
        await queryRunner.query(`CREATE TABLE "task_proofs" ("id" SERIAL NOT NULL, "assignment_id" integer NOT NULL, "type" "public"."task_proofs_type_enum" NOT NULL, "status" "public"."task_proofs_status_enum" NOT NULL DEFAULT 'PENDING', "file_url" character varying, "text_content" character varying, "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_e352ee6936178d7b2c8a7b2b92d" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."notifications_audience_enum" AS ENUM('user', 'admin')`);
        await queryRunner.query(`CREATE TABLE "notifications" ("id" SERIAL NOT NULL, "user_id" integer, "task_id" integer, "audience" "public"."notifications_audience_enum" NOT NULL DEFAULT 'user', "title" character varying NOT NULL, "message" text NOT NULL, "type" character varying, "is_read" boolean NOT NULL DEFAULT false, "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_6a72c3c0f683f6462415e653c3a" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "audit_logs" ("id" SERIAL NOT NULL, "action" character varying NOT NULL, "reason" text, "targetUserId" integer NOT NULL, "adminId" integer, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_1bb179d048bbc581caa3b013439" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "performer_stats" ADD CONSTRAINT "FK_16edbf6bf408fcd9c692773e5e8" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "requester_stats" ADD CONSTRAINT "FK_af2652d0aaa9f7749a766e506c4" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "identity_verifications" ADD CONSTRAINT "FK_d5f768de648407911f33a6e9a26" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "identity_verifications" ADD CONSTRAINT "FK_c3bc924da4c2a5ecee5eb91c87d" FOREIGN KEY ("reviewed_by") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "users" ADD CONSTRAINT "FK_d935fed11c5e7329d936df27966" FOREIGN KEY ("performerStatsId") REFERENCES "performer_stats"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "users" ADD CONSTRAINT "FK_2e05454716cc09653052d3b0548" FOREIGN KEY ("requesterStatsId") REFERENCES "requester_stats"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "messages" ADD CONSTRAINT "FK_3bc55a7c3f9ed54b520bb5cfe23" FOREIGN KEY ("conversation_id") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "messages" ADD CONSTRAINT "FK_22133395bd13b970ccd0c34ab22" FOREIGN KEY ("sender_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "conversations" ADD CONSTRAINT "FK_3f1509bf579deae2cbe23aa3df4" FOREIGN KEY ("task_id") REFERENCES "tasks"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "task_categories" ADD CONSTRAINT "FK_3d8679aec1b4057bb0109cc5873" FOREIGN KEY ("task_id") REFERENCES "tasks"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "task_categories" ADD CONSTRAINT "FK_c980a208989aa8de8a88092b4c1" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "tasks" ADD CONSTRAINT "FK_171c1a03aedf384a5b1a0624f25" FOREIGN KEY ("requester_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "task-applications" ADD CONSTRAINT "FK_bed6b1849dbcdaeba471b82862a" FOREIGN KEY ("task_id") REFERENCES "tasks"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "task-applications" ADD CONSTRAINT "FK_6696cb316bd68420e43b862a976" FOREIGN KEY ("performer_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "task-assignments" ADD CONSTRAINT "FK_e22f622dd82382010445cb81e06" FOREIGN KEY ("application_id") REFERENCES "task-applications"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "task-assignments" ADD CONSTRAINT "FK_a55d71a709281e7c90797fe30e3" FOREIGN KEY ("task_id") REFERENCES "tasks"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "task-assignments" ADD CONSTRAINT "FK_85509f49a55ae7955cff3639274" FOREIGN KEY ("performer_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "reviews" ADD CONSTRAINT "FK_d27a79b26ffcfbf4fc314bf7675" FOREIGN KEY ("assignment_id") REFERENCES "task-assignments"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "reviews" ADD CONSTRAINT "FK_92e950a2513a79bb3fab273c92e" FOREIGN KEY ("reviewer_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "reviews" ADD CONSTRAINT "FK_a7b3e1afadd6b52f3b6864745e3" FOREIGN KEY ("reviewee_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "task_proofs" ADD CONSTRAINT "FK_e9c90e34bc51343ff51d52d622b" FOREIGN KEY ("assignment_id") REFERENCES "task-assignments"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "audit_logs" ADD CONSTRAINT "FK_5b7fbc8045a0654e5f8db27dc5c" FOREIGN KEY ("targetUserId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "audit_logs" ADD CONSTRAINT "FK_9d53d8c4d4227c02e4476129d25" FOREIGN KEY ("adminId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "audit_logs" DROP CONSTRAINT "FK_9d53d8c4d4227c02e4476129d25"`);
        await queryRunner.query(`ALTER TABLE "audit_logs" DROP CONSTRAINT "FK_5b7fbc8045a0654e5f8db27dc5c"`);
        await queryRunner.query(`ALTER TABLE "task_proofs" DROP CONSTRAINT "FK_e9c90e34bc51343ff51d52d622b"`);
        await queryRunner.query(`ALTER TABLE "reviews" DROP CONSTRAINT "FK_a7b3e1afadd6b52f3b6864745e3"`);
        await queryRunner.query(`ALTER TABLE "reviews" DROP CONSTRAINT "FK_92e950a2513a79bb3fab273c92e"`);
        await queryRunner.query(`ALTER TABLE "reviews" DROP CONSTRAINT "FK_d27a79b26ffcfbf4fc314bf7675"`);
        await queryRunner.query(`ALTER TABLE "task-assignments" DROP CONSTRAINT "FK_85509f49a55ae7955cff3639274"`);
        await queryRunner.query(`ALTER TABLE "task-assignments" DROP CONSTRAINT "FK_a55d71a709281e7c90797fe30e3"`);
        await queryRunner.query(`ALTER TABLE "task-assignments" DROP CONSTRAINT "FK_e22f622dd82382010445cb81e06"`);
        await queryRunner.query(`ALTER TABLE "task-applications" DROP CONSTRAINT "FK_6696cb316bd68420e43b862a976"`);
        await queryRunner.query(`ALTER TABLE "task-applications" DROP CONSTRAINT "FK_bed6b1849dbcdaeba471b82862a"`);
        await queryRunner.query(`ALTER TABLE "tasks" DROP CONSTRAINT "FK_171c1a03aedf384a5b1a0624f25"`);
        await queryRunner.query(`ALTER TABLE "task_categories" DROP CONSTRAINT "FK_c980a208989aa8de8a88092b4c1"`);
        await queryRunner.query(`ALTER TABLE "task_categories" DROP CONSTRAINT "FK_3d8679aec1b4057bb0109cc5873"`);
        await queryRunner.query(`ALTER TABLE "conversations" DROP CONSTRAINT "FK_3f1509bf579deae2cbe23aa3df4"`);
        await queryRunner.query(`ALTER TABLE "messages" DROP CONSTRAINT "FK_22133395bd13b970ccd0c34ab22"`);
        await queryRunner.query(`ALTER TABLE "messages" DROP CONSTRAINT "FK_3bc55a7c3f9ed54b520bb5cfe23"`);
        await queryRunner.query(`ALTER TABLE "users" DROP CONSTRAINT "FK_2e05454716cc09653052d3b0548"`);
        await queryRunner.query(`ALTER TABLE "users" DROP CONSTRAINT "FK_d935fed11c5e7329d936df27966"`);
        await queryRunner.query(`ALTER TABLE "identity_verifications" DROP CONSTRAINT "FK_c3bc924da4c2a5ecee5eb91c87d"`);
        await queryRunner.query(`ALTER TABLE "identity_verifications" DROP CONSTRAINT "FK_d5f768de648407911f33a6e9a26"`);
        await queryRunner.query(`ALTER TABLE "requester_stats" DROP CONSTRAINT "FK_af2652d0aaa9f7749a766e506c4"`);
        await queryRunner.query(`ALTER TABLE "performer_stats" DROP CONSTRAINT "FK_16edbf6bf408fcd9c692773e5e8"`);
        await queryRunner.query(`DROP TABLE "audit_logs"`);
        await queryRunner.query(`DROP TABLE "notifications"`);
        await queryRunner.query(`DROP TYPE "public"."notifications_audience_enum"`);
        await queryRunner.query(`DROP TABLE "task_proofs"`);
        await queryRunner.query(`DROP TYPE "public"."task_proofs_status_enum"`);
        await queryRunner.query(`DROP TYPE "public"."task_proofs_type_enum"`);
        await queryRunner.query(`DROP TABLE "reviews"`);
        await queryRunner.query(`DROP TABLE "task-assignments"`);
        await queryRunner.query(`DROP TYPE "public"."task-assignments_status_enum"`);
        await queryRunner.query(`DROP TABLE "task-applications"`);
        await queryRunner.query(`DROP TYPE "public"."task-applications_status_enum"`);
        await queryRunner.query(`DROP TABLE "tasks"`);
        await queryRunner.query(`DROP TYPE "public"."tasks_status_enum"`);
        await queryRunner.query(`DROP TABLE "task_categories"`);
        await queryRunner.query(`DROP TABLE "categories"`);
        await queryRunner.query(`DROP TABLE "conversations"`);
        await queryRunner.query(`DROP TABLE "messages"`);
        await queryRunner.query(`DROP TABLE "users"`);
        await queryRunner.query(`DROP TYPE "public"."users_status_enum"`);
        await queryRunner.query(`DROP TYPE "public"."users_current_role_enum"`);
        await queryRunner.query(`DROP TABLE "identity_verifications"`);
        await queryRunner.query(`DROP TYPE "public"."identity_verifications_status_enum"`);
        await queryRunner.query(`DROP TABLE "requester_stats"`);
        await queryRunner.query(`DROP TABLE "performer_stats"`);
    }

}
