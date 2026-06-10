import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { games } from "@/db/schema";
import { fetchTopGames } from "@/lib/twitch";
import { sql } from "drizzle-orm";

export async function GET(req: NextRequest) {
  const secret = req.headers.get("x-cron-secret");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const twitchGames = await fetchTopGames();

  for (const game of twitchGames) {
    const score =
      game.channel_count > 0
        ? game.viewer_count / game.channel_count
        : 0;

    await db
      .insert(games)
      .values({
        id: game.id,
        title: game.name,
        boxArtUrl: game.box_art_url,
        viewerCount: game.viewer_count,
        channelCount: game.channel_count,
        score,
        tags: [],
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: games.id,
        set: {
          title: game.name,
          boxArtUrl: game.box_art_url,
          viewerCount: game.viewer_count,
          channelCount: game.channel_count,
          score,
          updatedAt: new Date(),
        },
      });
  }

  return NextResponse.json({ synced: twitchGames.length });
}
