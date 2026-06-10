CREATE TABLE "games" (
	"id" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"box_art_url" text NOT NULL,
	"viewer_count" integer DEFAULT 0 NOT NULL,
	"channel_count" integer DEFAULT 0 NOT NULL,
	"score" real DEFAULT 0 NOT NULL,
	"tags" text[] DEFAULT '{}' NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
