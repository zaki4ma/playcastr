import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { games } from "@/db/schema";
import { sql, eq } from "drizzle-orm";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const current = await db
    .select({ tags: games.tags })
    .from(games)
    .where(eq(games.id, id))
    .limit(1);

  if (!current.length || !current[0].tags.length) return NextResponse.json([]);

  const currentTags = current[0].tags;

  const result = await db.execute(sql`
    SELECT id, title, box_art_url, viewer_count, channel_count, score, tags, updated_at
    FROM games
    WHERE id != ${id}
      AND tags && ${currentTags}::text[]
    ORDER BY (
      SELECT COUNT(*) FROM unnest(tags) t WHERE t = ANY(${currentTags}::text[])
    ) DESC, score DESC
    LIMIT 4
  `);

  const rows = (result.rows as Record<string, unknown>[]).map((r) => ({
    id: r.id,
    title: r.title,
    boxArtUrl: r.box_art_url,
    viewerCount: Number(r.viewer_count),
    channelCount: Number(r.channel_count),
    score: Number(r.score),
    tags: (r.tags as string[]) ?? [],
    updatedAt: r.updated_at,
    scoreDelta: null,
  }));

  return NextResponse.json(rows);
}
