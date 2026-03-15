DROP INDEX "tokuzou_generated_action_user_candidate_idx";--> statement-breakpoint
ALTER TABLE "profile" ADD COLUMN "discovery_cursor" integer DEFAULT 0 NOT NULL;