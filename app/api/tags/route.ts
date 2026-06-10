import { NextResponse } from "next/server";
import { db } from "@/db";
import { games } from "@/db/schema";
import { sql } from "drizzle-orm";

export async function GET() {
  const rows = await db
    .select({ tags: games.tags })
    .from(games)
    .where(sql`array_length(${games.tags}, 1) > 0`);

  const freq: Record<string, number> = {};
  for (const row of rows) {
    for (const tag of row.tags) {
      freq[tag] = (freq[tag] ?? 0) + 1;
    }
  }

  const tags = Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .map(([tag]) => tag);

  return NextResponse.json(tags);
}
