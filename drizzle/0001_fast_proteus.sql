CREATE TABLE "game_history" (
	"id" serial PRIMARY KEY NOT NULL,
	"game_id" text NOT NULL,
	"score" real NOT NULL,
	"viewer_count" integer NOT NULL,
	"channel_count" integer NOT NULL,
	"recorded_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "game_history" ADD CONSTRAINT "game_history_game_id_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE cascade ON UPDATE no action;