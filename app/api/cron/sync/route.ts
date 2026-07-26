import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { games, gameHistory } from "@/db/schema";
import { fetchTopGames } from "@/lib/twitch";
import { inArray, notInArray, sql } from "drizzle-orm";

export async function GET(req: NextRequest) {
  // Vercel Cron: Authorization: Bearer <secret>
  // GitHub Actions (旧): x-cron-secret: <secret>
  const authHeader = req.headers.get("authorization");
  const legacyHeader = req.headers.get("x-cron-secret");
  const validSecret = process.env.CRON_SECRET;
  const isAuthorized =
    authHeader === `Bearer ${validSecret}` || legacyHeader === validSecret;
  if (!isAuthorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const twitchGames = await fetchTopGames();
  const now = new Date();

  const ids = twitchGames.map((g) => g.id);

  // 既存の nameJa を保持するため一括取得 + 6h前のchannel_countを一括取得
  const [existing, historyResult] = await Promise.all([
    db
      .select({ id: games.id, nameJa: games.nameJa, createdAt: games.createdAt })
      .from(games)
      .where(inArray(games.id, ids)),
    // 6h前のchannel_countを取得（±2h窓で最も近いレコード）
    // game_id フィルタは配列パラメータの互換性問題を避けるため省略し、時間帯で絞る
    db.execute(sql`
      SELECT DISTINCT ON (game_id) game_id, channel_count
      FROM game_history
      WHERE recorded_at BETWEEN NOW() - INTERVAL '8 hours' AND NOW() - INTERVAL '4 hours'
      ORDER BY game_id, ABS(EXTRACT(EPOCH FROM (recorded_at - (NOW() - INTERVAL '6 hours'))))
    `),
  ]);

  const existingMap = new Map(existing.map((r) => [r.id, r]));
  const pastChannelMap = new Map(
    (historyResult.rows as { game_id: string; channel_count: number }[]).map((r) => [
      r.game_id,
      Number(r.channel_count),
    ])
  );

  // DB upsert と history insert を並列化
  await Promise.all(
    twitchGames.map(async (game) => {
      const score =
        game.channel_count > 0 ? game.viewer_count / game.channel_count : 0;

      // モメンタムスコア: チャンネル数の6h増加率 × log2(チャンネル数+1)
      // 有名配信者1人の視聴者スパイクを無視し、配信者数の増加傾向を捉える
      let momentumScore = 0;
      if (game.channel_count >= 5 && pastChannelMap.has(game.id)) {
        const past = pastChannelMap.get(game.id)!;
        const growthRate = (game.channel_count - past) / Math.max(past, 1);
        if (growthRate > 0) {
          momentumScore = growthRate * Math.log2(game.channel_count + 1);
        }
      }

      const existingRow = existingMap.get(game.id);
      // nameJa は cron では更新しない（モーダルの on-demand fetch に任せる）
      const nameJa = existingRow?.nameJa ?? null;

      await db
        .insert(games)
        .values({
          id: game.id,
          title: game.name,
          boxArtUrl: game.box_art_url,
          viewerCount: game.viewer_count,
          channelCount: game.channel_count,
          score,
          momentumScore,
          tags: game.tags,
          nameJa,
          createdAt: now,
          updatedAt: now,
        })
        .onConflictDoUpdate({
          target: games.id,
          set: {
            title: game.name,
            boxArtUrl: game.box_art_url,
            viewerCount: game.viewer_count,
            channelCount: game.channel_count,
            score,
            momentumScore,
            tags: game.tags,
            updatedAt: now,
          },
        });

      await db.insert(gameHistory).values({
        gameId: game.id,
        score,
        viewerCount: game.viewer_count,
        channelCount: game.channel_count,
        recordedAt: now,
      });
    })
  );

  // 今回のリストにないゲームをゼロリセット
  if (ids.length > 0) {
    await db
      .update(games)
      .set({ viewerCount: 0, channelCount: 0, score: 0, updatedAt: now })
      .where(notInArray(games.id, ids));
  }

  return NextResponse.json({ synced: twitchGames.length });
}
