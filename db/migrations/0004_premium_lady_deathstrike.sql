CREATE TABLE "tokuzou_asset" (
	"id" text PRIMARY KEY NOT NULL,
	"gender" varchar(16) NOT NULL,
	"file_id" text,
	"image_url" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tokuzou_generated_action" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"candidate_id" text NOT NULL,
	"asset_id" text NOT NULL,
	"action" varchar(16) NOT NULL,
	"candidate_gender" varchar(16) NOT NULL,
	"candidate_name" text NOT NULL,
	"candidate_age" integer NOT NULL,
	"candidate_location" text NOT NULL,
	"candidate_occupation" text NOT NULL,
	"candidate_bio" text NOT NULL,
	"candidate_image_url" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tokuzou_generated_match" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"candidate_id" text NOT NULL,
	"asset_id" text NOT NULL,
	"candidate_gender" varchar(16) NOT NULL,
	"candidate_name" text NOT NULL,
	"candidate_age" integer NOT NULL,
	"candidate_location" text NOT NULL,
	"candidate_occupation" text NOT NULL,
	"candidate_bio" text NOT NULL,
	"candidate_image_url" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tokuzou_generated_message" (
	"id" text PRIMARY KEY NOT NULL,
	"match_id" text NOT NULL,
	"sender" varchar(16) NOT NULL,
	"sender_name" text NOT NULL,
	"body" text NOT NULL,
	"is_read" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "tokuzou_asset" ADD CONSTRAINT "tokuzou_asset_file_id_files_id_fk" FOREIGN KEY ("file_id") REFERENCES "public"."files"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tokuzou_generated_action" ADD CONSTRAINT "tokuzou_generated_action_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tokuzou_generated_action" ADD CONSTRAINT "tokuzou_generated_action_asset_id_tokuzou_asset_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."tokuzou_asset"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tokuzou_generated_match" ADD CONSTRAINT "tokuzou_generated_match_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tokuzou_generated_match" ADD CONSTRAINT "tokuzou_generated_match_asset_id_tokuzou_asset_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."tokuzou_asset"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tokuzou_generated_message" ADD CONSTRAINT "tokuzou_generated_message_match_id_tokuzou_generated_match_id_fk" FOREIGN KEY ("match_id") REFERENCES "public"."tokuzou_generated_match"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "tokuzou_asset_gender_idx" ON "tokuzou_asset" USING btree ("gender");--> statement-breakpoint
CREATE INDEX "tokuzou_asset_gender_sort_idx" ON "tokuzou_asset" USING btree ("gender","sort_order");--> statement-breakpoint
CREATE INDEX "tokuzou_generated_action_userId_idx" ON "tokuzou_generated_action" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "tokuzou_generated_action_user_candidate_idx" ON "tokuzou_generated_action" USING btree ("user_id","candidate_id");--> statement-breakpoint
CREATE INDEX "tokuzou_generated_match_userId_idx" ON "tokuzou_generated_match" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "tokuzou_generated_match_user_candidate_idx" ON "tokuzou_generated_match" USING btree ("user_id","candidate_id");--> statement-breakpoint
CREATE INDEX "tokuzou_generated_message_matchId_idx" ON "tokuzou_generated_message" USING btree ("match_id");