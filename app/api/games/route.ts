import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { games, gameHistory } from "@/db/schema";
import { desc, ilike, and, sql } from "drizzle-orm";

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
      : sort === "momentum"
      ? desc(games.momentumScore)
      : desc(games.score);

  const [rows, prevResult, weeklyResult] = await Promise.all([
    query.orderBy(orderCol).limit(200),
    // 30分前比: 2番目に新しいレコード
    db.execute(sql`
      WITH ranked AS (
        SELECT game_id, score,
               ROW_NUMBER() OVER (PARTITION BY game_id ORDER BY recorded_at DESC) AS rn
        FROM game_history
      )
      SELECT game_id, score FROM ranked WHERE rn = 2
    `),
    // 7日前比: 過去7日の最初のレコード
    db.execute(sql`
      SELECT DISTINCT ON (game_id) game_id, score
      FROM game_history
      WHERE recorded_at >= NOW() - INTERVAL '7 days'
      ORDER BY game_id, recorded_at ASC
    `),
  ]);

  const prevMap = new Map(
    (prevResult.rows as { game_id: string; score: number }[]).map((r) => [
      r.game_id,
      Number(r.score),
    ])
  );

  const weeklyMap = new Map(
    (weeklyResult.rows as { game_id: string; score: number }[]).map((r) => [
      r.game_id,
      Number(r.score),
    ])
  );

  const result = rows.map((g) => ({
    ...g,
    scoreDelta: prevMap.has(g.id) ? g.score - (prevMap.get(g.id) ?? g.score) : null,
    weeklyDelta: weeklyMap.has(g.id) ? g.score - (weeklyMap.get(g.id) ?? g.score) : null,
  }));

  return NextResponse.json(result);
}
