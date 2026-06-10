import { pgTable, text, integer, real, timestamp } from "drizzle-orm/pg-core";

export const games = pgTable("games", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  boxArtUrl: text("box_art_url").notNull(),
  viewerCount: integer("viewer_count").notNull().default(0),
  channelCount: integer("channel_count").notNull().default(0),
  score: real("score").notNull().default(0),
  tags: text("tags").array().notNull().default([]),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Game = typeof games.$inferSelect;
