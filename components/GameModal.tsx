"use client";

import { useEffect, useState } from "react";
import { X, Eye, Radio, TrendingUp, Clock, Tv } from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";
import type { Game, GameHistory } from "@/db/schema";

interface Props {
  game: Game;
  onClose: () => void;
}

function formatNumber(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return String(n);
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("ja-JP", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getPeakHint(history: GameHistory[]): string | null {
  if (history.length < 4) return null;

  // JST (UTC+9) で時間帯ごとの平均視聴者数を集計
  const hourMap: Record<number, { total: number; count: number }> = {};
  for (const h of history) {
    const jstHour = (new Date(h.recordedAt as unknown as string).getUTCHours() + 9) % 24;
    if (!hourMap[jstHour]) hourMap[jstHour] = { total: 0, count: 0 };
    hourMap[jstHour].total += h.viewerCount;
    hourMap[jstHour].count += 1;
  }

  const entries = Object.entries(hourMap)
    .map(([h, v]) => ({ hour: Number(h), avg: v.total / v.count }))
    .sort((a, b) => b.avg - a.avg);

  if (entries.length === 0) return null;

  const peak = entries[0].hour;
  const endHour = (peak + 2) % 24;
  const timeLabel = `${String(peak).padStart(2, "0")}〜${String(endHour).padStart(2, "0")}時`;

  if (peak >= 18 && peak < 24) return `夜帯（${timeLabel}）に視聴者が集まりやすい`;
  if (peak >= 12 && peak < 18) return `夕方帯（${timeLabel}）に視聴者が集まりやすい`;
  if (peak >= 6 && peak < 12) return `朝〜昼帯（${timeLabel}）に視聴者が集まりやすい`;
  return `深夜帯（${timeLabel}）に視聴者が集まりやすい`;
}

export default function GameModal({ game, onClose }: Props) {
  const [history, setHistory] = useState<GameHistory[]>([]);

  useEffect(() => {
    fetch(`/api/games/${game.id}/history`)
      .then((r) => r.json())
      .then((data: GameHistory[]) => setHistory(data))
      .catch(() => {});
  }, [game.id]);

  const chartData = history.map((h) => ({
    time: formatTime(h.recordedAt as unknown as string),
    score: parseFloat(h.score.toFixed(2)),
  }));

  const peakHint = getPeakHint(history);

  return (
    <div
      className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-6 relative"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors"
        >
          <X size={20} />
        </button>

        <div className="flex gap-5">
          <img
            src={game.boxArtUrl}
            alt={game.title}
            width={80}
            height={107}
            className="rounded-lg shrink-0 object-cover"
          />
          <div>
            <h2 className="text-xl font-bold text-white leading-tight">
              {game.title}
            </h2>
            <div className="mt-3 space-y-2 text-sm">
              <Stat icon={<TrendingUp size={14} />} label="穴場スコア" value={game.score.toFixed(2)} color="text-cyan-400" />
              <Stat icon={<Eye size={14} />} label="総視聴者数" value={formatNumber(game.viewerCount)} color="text-purple-400" />
              <Stat icon={<Radio size={14} />} label="配信チャンネル数" value={formatNumber(game.channelCount)} color="text-slate-300" />
            </div>
          </div>
        </div>

        {/* 配信時間帯ヒント */}
        {peakHint && (
          <div className="mt-4 flex items-start gap-2 bg-indigo-950/50 border border-indigo-500/30 rounded-lg px-3 py-2.5">
            <Tv size={13} className="text-indigo-400 mt-0.5 shrink-0" />
            <p className="text-xs text-indigo-300">{peakHint} <span className="text-indigo-500">(JST)</span></p>
          </div>
        )}

        {/* トレンドグラフ */}
        {chartData.length >= 2 ? (
          <div className="mt-4 pt-4 border-t border-slate-700/50">
            <p className="text-xs text-slate-400 mb-3">穴場スコア推移（直近24h）</p>
            <ResponsiveContainer width="100%" height={100}>
              <LineChart data={chartData}>
                <XAxis
                  dataKey="time"
                  tick={{ fontSize: 10, fill: "#64748b" }}
                  tickLine={false}
                  axisLine={false}
                  interval="preserveStartEnd"
                />
                <YAxis hide domain={["auto", "auto"]} />
                <Tooltip
                  contentStyle={{
                    background: "#1e293b",
                    border: "1px solid #334155",
                    borderRadius: "8px",
                    fontSize: "12px",
                    color: "#e2e8f0",
                  }}
                  labelStyle={{ color: "#94a3b8" }}
                />
                <Line
                  type="monotone"
                  dataKey="score"
                  stroke="#22d3ee"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4, fill: "#22d3ee" }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="mt-4 pt-4 border-t border-slate-700/50">
            <p className="text-xs text-slate-500 text-center py-2">
              グラフはデータ蓄積後に表示されます（次回 Cron 実行以降）
            </p>
          </div>
        )}

        <div className="mt-4 pt-4 border-t border-slate-700/50">
          <p className="text-xs text-slate-400 flex items-center gap-1.5">
            <Clock size={11} />
            最終更新: {new Date(game.updatedAt).toLocaleString("ja-JP")}
          </p>
          <p className="text-xs text-slate-500 mt-2 leading-relaxed">
            穴場スコアは「総視聴者数 ÷ 配信チャンネル数」で算出。
            スコアが高いほど視聴者が多いのにライバル配信者が少ない穴場ゲームです。
          </p>
        </div>
      </div>
    </div>
  );
}

function Stat({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className={`${color}`}>{icon}</span>
      <span className="text-slate-400">{label}</span>
      <span className={`ml-auto font-semibold ${color}`}>{value}</span>
    </div>
  );
}
