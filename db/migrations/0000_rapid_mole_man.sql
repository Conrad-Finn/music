CREATE TYPE "public"."card_status" AS ENUM('new', 'learning', 'mastered');--> statement-breakpoint
CREATE TYPE "public"."message_role" AS ENUM('user', 'assistant', 'system');--> statement-breakpoint
CREATE TYPE "public"."part_of_speech" AS ENUM('noun', 'verb', 'adjective', 'adverb', 'particle', 'other');--> statement-breakpoint
CREATE TYPE "public"."session_mode" AS ENUM('listen', 'learn', 'mixed');--> statement-breakpoint
CREATE TYPE "public"."song_source" AS ENUM('local', 'platform');--> statement-breakpoint
CREATE TABLE "card_progress" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"card_id" uuid NOT NULL,
	"status" "card_status" DEFAULT 'new' NOT NULL,
	"last_reviewed_at" timestamp,
	"review_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cards" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"line_id" uuid NOT NULL,
	"word" varchar(100) NOT NULL,
	"reading" varchar(100),
	"meaning" text NOT NULL,
	"part_of_speech" "part_of_speech" DEFAULT 'other',
	"example_sentence" text,
	"example_translation" text,
	"audio_clip_url" text,
	"word_position" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "conversations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"title" varchar(200) NOT NULL,
	"summary" text,
	"song_id" uuid,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "favorites" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"line_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lines" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"song_id" uuid NOT NULL,
	"line_number" integer NOT NULL,
	"content_ja" text NOT NULL,
	"content_zh" text,
	"furigana" jsonb,
	"start_time" integer,
	"end_time" integer,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"conversation_id" uuid NOT NULL,
	"role" "message_role" NOT NULL,
	"content" text NOT NULL,
	"tokens" integer,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"song_id" uuid,
	"mode" "session_mode" DEFAULT 'mixed' NOT NULL,
	"started_at" timestamp DEFAULT now() NOT NULL,
	"ended_at" timestamp,
	"interactions" jsonb
);
--> statement-breakpoint
CREATE TABLE "songs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" varchar(200) NOT NULL,
	"artist" varchar(100),
	"duration" integer,
	"cover_url" text,
	"source" "song_source" DEFAULT 'platform' NOT NULL,
	"source_ref" varchar(255),
	"creator_id" uuid,
	"is_public" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"nickname" varchar(50),
	"preferences" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_profiles_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
ALTER TABLE "card_progress" ADD CONSTRAINT "card_progress_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "neon_auth"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "card_progress" ADD CONSTRAINT "card_progress_card_id_cards_id_fk" FOREIGN KEY ("card_id") REFERENCES "public"."cards"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cards" ADD CONSTRAINT "cards_line_id_lines_id_fk" FOREIGN KEY ("line_id") REFERENCES "public"."lines"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "neon_auth"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_song_id_songs_id_fk" FOREIGN KEY ("song_id") REFERENCES "public"."songs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "favorites" ADD CONSTRAINT "favorites_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "neon_auth"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "favorites" ADD CONSTRAINT "favorites_line_id_lines_id_fk" FOREIGN KEY ("line_id") REFERENCES "public"."lines"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lines" ADD CONSTRAINT "lines_song_id_songs_id_fk" FOREIGN KEY ("song_id") REFERENCES "public"."songs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "neon_auth"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_song_id_songs_id_fk" FOREIGN KEY ("song_id") REFERENCES "public"."songs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "songs" ADD CONSTRAINT "songs_creator_id_user_id_fk" FOREIGN KEY ("creator_id") REFERENCES "neon_auth"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_profiles" ADD CONSTRAINT "user_profiles_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "neon_auth"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "card_progress_user_id_idx" ON "card_progress" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "card_progress_card_id_idx" ON "card_progress" USING btree ("card_id");--> statement-breakpoint
CREATE INDEX "card_progress_status_idx" ON "card_progress" USING btree ("user_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "card_progress_user_card_idx" ON "card_progress" USING btree ("user_id","card_id");--> statement-breakpoint
CREATE INDEX "cards_line_id_idx" ON "cards" USING btree ("line_id");--> statement-breakpoint
CREATE INDEX "cards_word_idx" ON "cards" USING btree ("word");--> statement-breakpoint
CREATE INDEX "conversations_user_id_idx" ON "conversations" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "conversations_song_id_idx" ON "conversations" USING btree ("song_id");--> statement-breakpoint
CREATE INDEX "conversations_created_at_idx" ON "conversations" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "favorites_user_id_idx" ON "favorites" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "favorites_line_id_idx" ON "favorites" USING btree ("line_id");--> statement-breakpoint
CREATE UNIQUE INDEX "favorites_user_line_idx" ON "favorites" USING btree ("user_id","line_id");--> statement-breakpoint
CREATE INDEX "lines_song_id_idx" ON "lines" USING btree ("song_id");--> statement-breakpoint
CREATE INDEX "lines_song_line_idx" ON "lines" USING btree ("song_id","line_number");--> statement-breakpoint
CREATE INDEX "messages_conversation_id_idx" ON "messages" USING btree ("conversation_id");--> statement-breakpoint
CREATE INDEX "messages_created_at_idx" ON "messages" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "sessions_user_id_idx" ON "sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "sessions_song_id_idx" ON "sessions" USING btree ("song_id");--> statement-breakpoint
CREATE INDEX "sessions_started_at_idx" ON "sessions" USING btree ("started_at");--> statement-breakpoint
CREATE INDEX "songs_title_idx" ON "songs" USING btree ("title");--> statement-breakpoint
CREATE INDEX "songs_artist_idx" ON "songs" USING btree ("artist");--> statement-breakpoint
CREATE INDEX "songs_creator_id_idx" ON "songs" USING btree ("creator_id");--> statement-breakpoint
CREATE UNIQUE INDEX "user_profiles_user_id_idx" ON "user_profiles" USING btree ("user_id");