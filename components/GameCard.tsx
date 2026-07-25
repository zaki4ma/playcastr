"use client";

import { Eye, Radio, TrendingUp, Bookmark } from "lucide-react";
import type { GameWithMeta } from "@/lib/types";
import { trackGameCardClick, trackWatchlistToggle } from "@/lib/analytics";

interface Props {
  game: GameWithMeta;
  rank: number;
  onClick: (game: GameWithMeta) => void;
  isWatched?: boolean;
  onToggleWatch?: (id: string) => void;
}

function formatNumber(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return String(n);
}

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

function StatusBadge({ delta, channelCount, score, createdAt }: { delta: number | null; channelCount: number; score: number; createdAt: Date | string | null }) {
  if (delta !== null && delta > 0 && channelCount < 50) {
    return (
      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400">
        ⚡ チャンス
      </span>
    );
  }
  const prev = delta !== null ? score - delta : null;
  const pct = (delta !== null && prev !== null && prev > 0) ? (delta / prev) * 100 : null;
  if (pct !== null && pct >= 15) {
    return (
      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-orange-500/20 text-orange-400">
        🔥 今が熱い
      </span>
    );
  }
  if (delta !== null && delta > 0) {
    return (
      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-yellow-500/20 text-yellow-400">
        ↑ 上昇中
      </span>
    );
  }
  if (createdAt && Date.now() - new Date(createdAt).getTime() < SEVEN_DAYS_MS) {
    return (
      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-blue-500/20 text-blue-400">
        NEW
      </span>
    );
  }
  return null;
}

export default function GameCard({ game, rank, onClick, isWatched = false, onToggleWatch }: Props) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => { trackGameCardClick(game.id, game.title, game.score, "main_list"); onClick(game); }}
      onKeyDown={(e) => e.key === "Enter" && (trackGameCardClick(game.id, game.title, game.score, "main_list"), onClick(game))}
      className="group flex items-center gap-4 w-full bg-slate-900/60 hover:bg-slate-800/80 border border-slate-700/50 hover:border-purple-500/50 rounded-xl p-4 text-left transition-all duration-200 cursor-pointer"
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
          <StatusBadge delta={game.scoreDelta} channelCount={game.channelCount} score={game.score} createdAt={game.createdAt} />
        </div>
        {game.nameJa && (
          <p className="text-xs text-slate-500 truncate">{game.nameJa}</p>
        )}
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
        {game.weeklyDelta !== null && game.weeklyDelta !== 0 && (
          <p className={`text-[10px] mt-0.5 ${game.weeklyDelta > 0 ? "text-purple-400" : "text-slate-600"}`}>
            7D {game.weeklyDelta > 0 ? "+" : ""}{game.weeklyDelta.toFixed(1)}
          </p>
        )}
      </div>

      {/* ウォッチリスト */}
      {onToggleWatch && (
        <button
          onClick={(e) => { e.stopPropagation(); trackWatchlistToggle(game.id, game.title, isWatched ? "remove" : "add"); onToggleWatch(game.id); }}
          className={`shrink-0 p-1 rounded transition-colors ${
            isWatched
              ? "text-cyan-400 hover:text-cyan-300"
              : "text-slate-600 hover:text-slate-400"
          }`}
          aria-label={isWatched ? "ウォッチリストから削除" : "ウォッチリストに追加"}
        >
          <Bookmark size={15} fill={isWatched ? "currentColor" : "none"} />
        </button>
      )}
    </div>
  );
}
