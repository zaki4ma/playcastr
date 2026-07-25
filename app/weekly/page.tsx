import Link from "next/link";
import { db } from "@/db";
import { sql } from "drizzle-orm";
import { ArrowLeft, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { fetchIgdbGame } from "@/lib/igdb";
import { fetchSteamSpyData, getSteamAppId, classifyActivity, type SteamActivity } from "@/lib/steamspy";

type ReportRow = {
  id: string;
  title: string;
  boxArtUrl: string;
  tags: string[];
  currentScore: number;
  startScore: number;
  scoreChange: number;
  pctChange: number;
};

type ReportRowWithSteam = ReportRow & {
  steamActivity: SteamActivity | null;
  steamLabel: string | null;
};

async function getWeeklyReport(): Promise<ReportRow[]> {
  const result = await db.execute(sql`
    WITH earliest AS (
      SELECT DISTINCT ON (game_id) game_id, score
      FROM game_history
      WHERE recorded_at >= NOW() - INTERVAL '7 days'
      ORDER BY game_id, recorded_at ASC
    ),
    latest AS (
      SELECT DISTINCT ON (game_id) game_id, score
      FROM game_history
      ORDER BY game_id, recorded_at DESC
    )
    SELECT
      g.id, g.title, g.box_art_url, g.tags,
      l.score                                              AS current_score,
      e.score                                              AS start_score,
      (l.score - e.score)                                  AS score_change,
      ROUND(((l.score - e.score) / NULLIF(e.score, 0) * 100)::numeric, 1) AS pct_change
    FROM games g
    JOIN latest   l ON l.game_id = g.id
    JOIN earliest e ON e.game_id = g.id
    ORDER BY score_change DESC
  `);

  return (result.rows as Record<string, unknown>[]).map((r) => ({
    id: String(r.id),
    title: String(r.title),
    boxArtUrl: String(r.box_art_url),
    tags: (r.tags as string[]) ?? [],
    currentScore: Number(r.current_score),
    startScore: Number(r.start_score),
    scoreChange: Number(r.score_change),
    pctChange: Number(r.pct_change),
  }));
}

async function fetchSteamForGame(title: string): Promise<{ activity: SteamActivity | null; label: string | null }> {
  try {
    const igdb = await fetchIgdbGame(title);
    const appId = getSteamAppId(igdb?.external_games);
    if (!appId) return { activity: null, label: null };
    const spy = await fetchSteamSpyData(appId);
    if (!spy) return { activity: null, label: null };
    const { activity, label } = classifyActivity(spy.average_2weeks);
    return { activity, label };
  } catch {
    return { activity: null, label: null };
  }
}

function formatScore(n: number) {
  return n.toFixed(1);
}

function SteamBadge({ activity, label }: { activity: SteamActivity | null; label: string | null }) {
  if (!activity || !label) return null;
  const styles: Record<SteamActivity, string> = {
    very_active: "bg-blue-500/20 text-blue-300 border-blue-500/30",
    active:      "bg-sky-500/20 text-sky-300 border-sky-500/30",
    low:         "bg-slate-700/60 text-slate-400 border-slate-600/30",
    inactive:    "bg-slate-800/60 text-slate-600 border-slate-700/30",
  };
  return (
    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded border ${styles[activity]}`}>
      Steam {activity === "very_active" ? "🔥活発" : activity === "active" ? "↑プレイ中" : activity === "low" ? "少数" : "休眠"}
    </span>
  );
}

function ChangeChip({ change, pct }: { change: number; pct: number }) {
  if (Math.abs(change) < 0.1) {
    return (
      <span className="flex items-center gap-1 text-slate-500 text-xs">
        <Minus size={12} /> 変化なし
      </span>
    );
  }
  const isUp = change > 0;
  return (
    <span className={`flex items-center gap-1 text-xs font-semibold ${isUp ? "text-emerald-400" : "text-red-400"}`}>
      {isUp ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
      {isUp ? "+" : ""}{formatScore(change)}
      <span className="font-normal opacity-70">({isUp ? "+" : ""}{pct.toFixed(1)}%)</span>
    </span>
  );
}

function GameRow({ game, rank, accent, showSteam }: { game: ReportRowWithSteam; rank: number; accent: string; showSteam?: boolean }) {
  return (
    <div className={`flex items-center gap-4 p-3 rounded-xl border ${accent} bg-slate-900/50`}>
      <span className="text-slate-500 font-mono text-sm w-5 text-center shrink-0">{rank}</span>
      <img
        src={game.boxArtUrl}
        alt={game.title}
        width={40}
        height={53}
        className="rounded shrink-0 object-cover"
      />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-slate-100 truncate">{game.title}</p>
        <div className="flex flex-wrap gap-1 mt-0.5">
          {showSteam && <SteamBadge activity={game.steamActivity} label={game.steamLabel} />}
          {game.tags.slice(0, 2).map((t) => (
            <span key={t} className="text-[10px] px-1.5 py-0.5 bg-slate-700/60 text-slate-400 rounded">
              {t}
            </span>
          ))}
        </div>
      </div>
      <div className="shrink-0 text-right space-y-0.5">
        <p className="text-sm font-bold text-cyan-400">{formatScore(game.currentScore)}</p>
        <ChangeChip change={game.scoreChange} pct={game.pctChange} />
      </div>
    </div>
  );
}

export default async function WeeklyPage() {
  const rows = await getWeeklyReport();

  const hasData = rows.length > 0;
  const gainerRows = rows.filter((r) => r.scoreChange > 0.05).slice(0, 10);
  const loserRows = [...rows].reverse().filter((r) => r.scoreChange < -0.05).slice(0, 10);
  const stable = rows.filter((r) => Math.abs(r.scoreChange) <= 0.05);

  // 上位5件のみ Steam 活動度を並列取得
  const [top5Steam, rest] = await Promise.all([
    Promise.all(
      gainerRows.slice(0, 5).map(async (g) => {
        const steam = await fetchSteamForGame(g.title);
        return { ...g, steamActivity: steam.activity, steamLabel: steam.label } as ReportRowWithSteam;
      })
    ),
    Promise.resolve(
      gainerRows.slice(5).map((g) => ({ ...g, steamActivity: null, steamLabel: null }) as ReportRowWithSteam)
    ),
  ]);

  const gainers: ReportRowWithSteam[] = [...top5Steam, ...rest];
  const losers: ReportRowWithSteam[] = loserRows.map((g) => ({ ...g, steamActivity: null, steamLabel: null }));

  const now = new Date().toLocaleDateString("ja-JP", { year: "numeric", month: "long", day: "numeric" });

  return (
    <div className="min-h-screen bg-[#0f0f1a] text-slate-100">
      <header className="border-b border-slate-800 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center gap-4">
          <Link
            href="/"
            className="flex items-center gap-1.5 text-slate-400 hover:text-slate-200 transition-colors text-sm"
          >
            <ArrowLeft size={15} />
            ダッシュボードへ
          </Link>
          <div className="ml-auto text-right">
            <h1 className="text-lg font-bold">
              <span className="text-purple-400">Play</span>
              <span className="text-cyan-400">Castr</span>
              <span className="text-slate-300 font-normal ml-2 text-base">週次レポート</span>
            </h1>
            <p className="text-xs text-slate-500">{now} 時点 / 過去7日間との比較</p>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8 space-y-10">
        {!hasData ? (
          <div className="text-center py-24 text-slate-500">
            <p className="text-lg">データがまだ蓄積されていません</p>
            <p className="text-sm mt-2">Cron が数回実行されると比較データが生成されます</p>
          </div>
        ) : (
          <>
            {/* 急上昇 */}
            <section>
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp size={18} className="text-emerald-400" />
                <h2 className="text-base font-bold text-slate-200">週間急上昇</h2>
                <span className="text-xs text-slate-500 ml-1">穴場スコアが伸びたゲーム</span>
              </div>
              <p className="text-[11px] text-slate-600 mb-4 ml-6">上位5件は Steam 活動度を表示（Steam🔥活発 × Twitch日本少 = 先行チャンス）</p>
              {gainers.length === 0 ? (
                <p className="text-sm text-slate-500 py-4">上昇したゲームはありません</p>
              ) : (
                <div className="space-y-2">
                  {gainers.map((g, i) => (
                    <GameRow key={g.id} game={g} rank={i + 1} accent="border-emerald-500/20" showSteam={i < 5} />
                  ))}
                </div>
              )}
            </section>

            {/* 急下落 */}
            <section>
              <div className="flex items-center gap-2 mb-4">
                <TrendingDown size={18} className="text-red-400" />
                <h2 className="text-base font-bold text-slate-200">週間急下落</h2>
                <span className="text-xs text-slate-500 ml-1">穴場スコアが下がったゲーム</span>
              </div>
              {losers.length === 0 ? (
                <p className="text-sm text-slate-500 py-4">下落したゲームはありません</p>
              ) : (
                <div className="space-y-2">
                  {losers.map((g, i) => (
                    <GameRow key={g.id} game={g} rank={i + 1} accent="border-red-500/20" />
                  ))}
                </div>
              )}
            </section>

            {/* 安定圏 */}
            {stable.length > 0 && (
              <section>
                <div className="flex items-center gap-2 mb-4">
                  <Minus size={16} className="text-slate-500" />
                  <h2 className="text-base font-bold text-slate-200">安定圏</h2>
                  <span className="text-xs text-slate-500 ml-1">ほぼ変化なし</span>
                </div>
                <div className="space-y-2">
                  {stable.map((g, i) => (
                    <GameRow key={g.id} game={{ ...g, steamActivity: null, steamLabel: null }} rank={i + 1} accent="border-slate-700/40" />
                  ))}
                </div>
              </section>
            )}

            <p className="text-xs text-slate-600 text-center pb-4">
              穴場スコア = 総視聴者数 ÷ 配信チャンネル数 / 数値は30分ごとに更新
            </p>
          </>
        )}
      </main>
    </div>
  );
}
