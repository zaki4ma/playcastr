import { NextResponse } from "next/server";
import { db } from "@/db";
import { sql } from "drizzle-orm";

export async function GET() {
  // 直近2スナップショット間でスコアが15%以上上昇したゲームを取得
  const result = await db.execute(sql`
    WITH latest AS (
      SELECT DISTINCT ON (game_id) game_id, score, recorded_at
      FROM game_history
      ORDER BY game_id, recorded_at DESC
    ),
    prev AS (
      WITH ranked AS (
        SELECT game_id, score,
               ROW_NUMBER() OVER (PARTITION BY game_id ORDER BY recorded_at DESC) AS rn
        FROM game_history
      )
      SELECT game_id, score FROM ranked WHERE rn = 2
    )
    SELECT
      g.*,
      l.score AS curr_score,
      p.score AS prev_score,
      ROUND(((l.score - p.score) / NULLIF(p.score, 0) * 100)::numeric, 1) AS pct_change
    FROM games g
    JOIN latest l ON l.game_id = g.id
    JOIN prev p ON p.game_id = g.id
    WHERE l.score > p.score * 1.15
    ORDER BY pct_change DESC
    LIMIT 5
  `);

  return NextResponse.json(result.rows);
}
