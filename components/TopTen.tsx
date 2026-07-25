"use client";

import { Eye, Radio, TrendingUp, Trophy } from "lucide-react";
import type { GameWithMeta } from "@/lib/types";
import { trackGameCardClick } from "@/lib/analytics";

interface Props {
  games: GameWithMeta[];
  onSelect: (game: GameWithMeta) => void;
}

function formatNumber(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return String(n);
}

function StatusBadge({ delta, channelCount }: { delta: number | null; channelCount: number }) {
  if (delta === null || delta <= 0) return null;
  if (channelCount < 50) {
    return (
      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 shrink-0">
        ⚡ チャンス
      </span>
    );
  }
  if (delta > 10) {
    return (
      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-orange-500/20 text-orange-400 shrink-0">
        🔥 今が熱い
      </span>
    );
  }
  return (
    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-yellow-500/20 text-yellow-400 shrink-0">
      ↑ 上昇中
    </span>
  );
}

const MEDAL = ["🥇", "🥈", "🥉"];
const PODIUM_BORDER = [
  "border-yellow-500/60 shadow-yellow-500/10",
  "border-slate-400/50 shadow-slate-400/10",
  "border-amber-600/50 shadow-amber-600/10",
];
const PODIUM_SCORE = ["text-yellow-400", "text-slate-300", "text-amber-500"];

export default function TopTen({ games, onSelect }: Props) {
  const top3 = games.slice(0, 3);
  const rest = games.slice(3, 10);

  return (
    <div className="space-y-4">
      {/* セクションヘッダー */}
      <div className="flex items-center gap-2">
        <Trophy size={16} className="text-yellow-400" />
        <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">
          Top 10 穴場ゲーム
        </h2>
      </div>

      {/* 1〜3位 */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {top3.map((game, i) => (
          <button
            key={game.id}
            onClick={() => { trackGameCardClick(game.id, game.title, game.score, "top10_podium"); onSelect(game); }}
            className={`relative flex flex-col items-center gap-3 p-4 bg-slate-900/70 border rounded-xl shadow-lg hover:brightness-110 transition-all text-left ${PODIUM_BORDER[i]}`}
          >
            <span className="text-2xl">{MEDAL[i]}</span>
            <img
              src={game.boxArtUrl}
              alt={game.title}
              width={72}
              height={96}
              className="rounded-lg object-cover shadow-md"
            />
            <div className="w-full text-center">
              <p className="text-sm font-bold text-slate-100 leading-tight line-clamp-2">
                {game.title}
              </p>
              <div className={`flex items-center justify-center gap-1 mt-2 font-bold text-lg ${PODIUM_SCORE[i]}`}>
                <TrendingUp size={16} />
                {game.score.toFixed(1)}
              </div>
              {game.scoreDelta !== null && game.scoreDelta > 0 && (
                <p className={`text-[10px] font-bold mt-0.5 ${
                  game.channelCount < 50 ? "text-emerald-400" : "text-orange-400"
                }`}>
                  {game.channelCount < 50 ? "⚡ チャンス" : "🔥 今が熱い"}
                </p>
              )}
              <div className="flex justify-center gap-3 mt-1 text-xs text-slate-500">
                <span className="flex items-center gap-1">
                  <Eye size={10} />
                  {formatNumber(game.viewerCount)}
                </span>
                <span className="flex items-center gap-1">
                  <Radio size={10} />
                  {formatNumber(game.channelCount)}
                </span>
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* 4〜10位 */}
      <div className="bg-slate-900/40 border border-slate-800 rounded-xl overflow-hidden">
        {rest.map((game, i) => (
          <button
            key={game.id}
            onClick={() => { trackGameCardClick(game.id, game.title, game.score, "top10_list"); onSelect(game); }}
            className="flex items-center gap-3 w-full px-4 py-3 hover:bg-slate-800/60 transition-colors border-b border-slate-800/60 last:border-0"
          >
            <span className="text-slate-500 font-mono text-sm w-5 shrink-0 text-right">
              {i + 4}
            </span>
            <img
              src={game.boxArtUrl}
              alt={game.title}
              width={32}
              height={43}
              className="rounded shrink-0 object-cover"
            />
            <span className="flex-1 text-sm font-medium text-slate-200 truncate text-left">
              {game.title}
            </span>
            <StatusBadge delta={game.scoreDelta} channelCount={game.channelCount} />
            <div className="flex items-center gap-1 text-cyan-400 font-semibold text-sm shrink-0">
              <TrendingUp size={12} />
              {game.score.toFixed(1)}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
