"use client";

import { Flame, TrendingUp } from "lucide-react";
import type { GameWithMeta } from "@/lib/types";
import { trackGameCardClick } from "@/lib/analytics";

type TrendingGame = GameWithMeta & { pctChange: number };

interface Props {
  trending: TrendingGame[];
  onSelect: (game: GameWithMeta) => void;
  lastUpdated: Date | null;
}

export default function TrendingSidebar({ trending, onSelect, lastUpdated }: Props) {
  return (
    <aside className="space-y-4">
      {/* 急上昇 */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-800">
          <Flame size={14} className="text-orange-400" />
          <h2 className="text-sm font-semibold text-slate-200">急上昇</h2>
          <span className="text-[10px] text-slate-500 ml-auto">前回比 +15% 以上</span>
        </div>

        {trending.length === 0 ? (
          <p className="text-xs text-slate-500 text-center py-6 px-4">
            データ蓄積後に表示されます
          </p>
        ) : (
          <div>
            {trending.map((game) => (
              <button
                key={game.id}
                onClick={() => { trackGameCardClick(game.id, game.title, game.score, "trending"); onSelect(game); }}
                className="flex items-center gap-3 w-full px-4 py-3 hover:bg-slate-800/60 transition-colors border-b border-slate-800/40 last:border-0 text-left"
              >
                <img
                  src={game.boxArtUrl}
                  alt={game.title}
                  width={36}
                  height={48}
                  className="rounded shrink-0 object-cover"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-200 truncate">
                    {game.title}
                  </p>
                  <div className="flex items-center gap-1 mt-0.5">
                    <TrendingUp size={10} className="text-cyan-500" />
                    <span className="text-[11px] text-cyan-500">{game.score.toFixed(1)}</span>
                  </div>
                </div>
                <span className="text-xs font-bold text-orange-400 shrink-0">
                  {Number.isFinite(game.pctChange) ? `+${game.pctChange}%` : "NEW"}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* バッジ説明 */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 space-y-3">
        <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">バッジの見方</h2>
        <div className="space-y-2.5">
          <div className="flex items-start gap-2.5">
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 shrink-0 mt-0.5">
              ⚡ チャンス
            </span>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              スコアが上昇中かつ配信チャンネル数が50未満。今すぐ参入すれば発見されやすい。
            </p>
          </div>
          <div className="flex items-start gap-2.5">
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-orange-500/20 text-orange-400 shrink-0 mt-0.5">
              🔥 今が熱い
            </span>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              穴場スコアが前回より大幅に上昇中。視聴者の注目が急増しているタイミング。
            </p>
          </div>
          <div className="flex items-start gap-2.5">
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-yellow-500/20 text-yellow-400 shrink-0 mt-0.5">
              ↑ 上昇中
            </span>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              穴場スコアが前回より上昇。緩やかにチャンスが広がっている状態。
            </p>
          </div>
        </div>
      </div>

      {/* 最終更新 */}
      {lastUpdated && (
        <p className="text-[11px] text-slate-600 text-center">
          最終更新: {lastUpdated.toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" })}
        </p>
      )}
    </aside>
  );
}
