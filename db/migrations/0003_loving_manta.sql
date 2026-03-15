CREATE TABLE "chat_message" (
	"id" text PRIMARY KEY NOT NULL,
	"match_id" text NOT NULL,
	"sender_user_id" text NOT NULL,
	"body" text NOT NULL,
	"is_read" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "match_action" (
	"id" text PRIMARY KEY NOT NULL,
	"actor_user_id" text NOT NULL,
	"target_user_id" text NOT NULL,
	"action" varchar(16) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "profile" (
	"user_id" text PRIMARY KEY NOT NULL,
	"gender" varchar(16) NOT NULL,
	"age" integer NOT NULL,
	"location" text NOT NULL,
	"occupation" text NOT NULL,
	"bio" text NOT NULL,
	"onboarding_completed" boolean DEFAULT false NOT NULL,
	"is_tokuzou" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "profile_photo" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"file_id" text,
	"image_url" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_primary" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tokuzou_match" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"tokuzou_user_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "chat_message" ADD CONSTRAINT "chat_message_match_id_tokuzou_match_id_fk" FOREIGN KEY ("match_id") REFERENCES "public"."tokuzou_match"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_message" ADD CONSTRAINT "chat_message_sender_user_id_user_id_fk" FOREIGN KEY ("sender_user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "match_action" ADD CONSTRAINT "match_action_actor_user_id_user_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "match_action" ADD CONSTRAINT "match_action_target_user_id_user_id_fk" FOREIGN KEY ("target_user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profile" ADD CONSTRAINT "profile_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profile_photo" ADD CONSTRAINT "profile_photo_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profile_photo" ADD CONSTRAINT "profile_photo_file_id_files_id_fk" FOREIGN KEY ("file_id") REFERENCES "public"."files"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tokuzou_match" ADD CONSTRAINT "tokuzou_match_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tokuzou_match" ADD CONSTRAINT "tokuzou_match_tokuzou_user_id_user_id_fk" FOREIGN KEY ("tokuzou_user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "chat_message_matchId_idx" ON "chat_message" USING btree ("match_id");--> statement-breakpoint
CREATE INDEX "chat_message_senderUserId_idx" ON "chat_message" USING btree ("sender_user_id");--> statement-breakpoint
CREATE INDEX "match_action_actorUserId_idx" ON "match_action" USING btree ("actor_user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "match_action_actor_target_idx" ON "match_action" USING btree ("actor_user_id","target_user_id");--> statement-breakpoint
CREATE INDEX "profile_photo_userId_idx" ON "profile_photo" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "profile_photo_userId_sortOrder_idx" ON "profile_photo" USING btree ("user_id","sort_order");--> statement-breakpoint
CREATE INDEX "tokuzou_match_userId_idx" ON "tokuzou_match" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "tokuzou_match_user_tokuzou_idx" ON "tokuzou_match" USING btree ("user_id","tokuzou_user_id");