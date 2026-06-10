import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { games } from "@/db/schema";
import { desc, ilike, sql, and } from "drizzle-orm";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const sort = searchParams.get("sort") ?? "score";
  const q = searchParams.get("q") ?? "";
  const tag = searchParams.get("tag") ?? "";

  const conditions = [];
  if (q) conditions.push(ilike(games.title, `%${q}%`));
  if (tag) conditions.push(sql`${games.tags} @> ARRAY[${tag}]::text[]`);

  let query = db.select().from(games).$dynamic();
  if (conditions.length > 0) {
    query = query.where(and(...conditions));
  }

  const orderCol =
    sort === "viewers"
      ? desc(games.viewerCount)
      : sort === "channels"
      ? desc(games.channelCount)
      : desc(games.score);

  const rows = await query.orderBy(orderCol).limit(200);
  return NextResponse.json(rows);
}
