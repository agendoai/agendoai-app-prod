ALTER TABLE "appointments" ADD COLUMN "validation_code_hash" text;--> statement-breakpoint
ALTER TABLE "appointments" ADD COLUMN "validation_code" text;--> statement-breakpoint
ALTER TABLE "appointments" ADD COLUMN "validation_attempts" integer DEFAULT 0;