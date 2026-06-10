import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { gameHistory } from "@/db/schema";
import { eq, desc, gte } from "drizzle-orm";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const rows = await db
    .select()
    .from(gameHistory)
    .where(eq(gameHistory.gameId, id))
    .orderBy(desc(gameHistory.recordedAt))
    .limit(48);

  return NextResponse.json(rows.reverse());
}
