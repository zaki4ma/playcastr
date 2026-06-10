import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { games } from "@/db/schema";
import { desc, ilike, sql } from "drizzle-orm";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const sort = searchParams.get("sort") ?? "score";
  const q = searchParams.get("q") ?? "";

  let query = db.select().from(games).$dynamic();

  if (q) {
    query = query.where(ilike(games.title, `%${q}%`));
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
