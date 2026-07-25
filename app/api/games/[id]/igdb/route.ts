import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { games } from "@/db/schema";
import { eq } from "drizzle-orm";
import { fetchIgdbGame } from "@/lib/igdb";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const rows = await db.select({ title: games.title }).from(games).where(eq(games.id, id)).limit(1);
  if (!rows.length) return NextResponse.json(null);

  const igdb = await fetchIgdbGame(rows[0].title);
  return NextResponse.json(igdb, {
    headers: { "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=3600" },
  });
}
