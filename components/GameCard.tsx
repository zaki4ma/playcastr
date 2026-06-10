"use client";

import { Eye, Radio, TrendingUp } from "lucide-react";
import type { GameWithMeta } from "@/lib/types";

interface Props {
  game: GameWithMeta;
  rank: number;
  onClick: (game: GameWithMeta) => void;
}

function formatNumber(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return String(n);
}

function HotBadge({ delta }: { delta: number | null }) {
  if (delta === null || delta <= 0) return null;
  const pct = delta / (delta > 0 ? 1 : 1); // delta is absolute
  const isVeryHot = delta > 10;
  return (
    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
      isVeryHot
        ? "bg-orange-500/20 text-orange-400"
        : "bg-yellow-500/20 text-yellow-400"
    }`}>
      {isVeryHot ? "🔥 今が熱い" : "↑ 上昇中"}
    </span>
  );
}

export default function GameCard({ game, rank, onClick }: Props) {
  return (
    <button
      onClick={() => onClick(game)}
      className="group flex items-center gap-4 w-full bg-slate-900/60 hover:bg-slate-800/80 border border-slate-700/50 hover:border-purple-500/50 rounded-xl p-4 text-left transition-all duration-200"
    >
      {/* ランク */}
      <span className="text-slate-500 font-mono text-sm w-6 shrink-0 text-center">
        {rank}
      </span>

      {/* サムネ */}
      <img
        src={game.boxArtUrl}
        alt={game.title}
        width={48}
        height={64}
        className="rounded shrink-0 object-cover"
      />

      {/* ゲーム情報 */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="font-semibold text-slate-100 truncate group-hover:text-purple-300 transition-colors">
            {game.title}
          </p>
          <HotBadge delta={game.scoreDelta} />
        </div>
        <div className="flex items-center gap-4 mt-1 text-xs text-slate-400">
          <span className="flex items-center gap-1">
            <Eye size={12} />
            {formatNumber(game.viewerCount)}
          </span>
          <span className="flex items-center gap-1">
            <Radio size={12} />
            {formatNumber(game.channelCount)}
          </span>
        </div>
        {game.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1.5">
            {game.tags.map((tag) => (
              <span
                key={tag}
                className="px-1.5 py-0.5 bg-slate-700/60 text-slate-400 rounded text-[10px]"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* スコア */}
      <div className="shrink-0 text-right">
        <div className="flex items-center gap-1 text-cyan-400 font-bold">
          <TrendingUp size={14} />
          {game.score.toFixed(1)}
        </div>
        {game.scoreDelta !== null && game.scoreDelta !== 0 && (
          <p className={`text-[10px] mt-0.5 ${game.scoreDelta > 0 ? "text-green-400" : "text-red-400"}`}>
            {game.scoreDelta > 0 ? "+" : ""}{game.scoreDelta.toFixed(1)}
          </p>
        )}
        {(game.scoreDelta === null || game.scoreDelta === 0) && (
          <p className="text-xs text-slate-500 mt-0.5">穴場スコア</p>
        )}
      </div>
    </button>
  );
}
