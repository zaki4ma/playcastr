"use client";

import { useEffect, useState } from "react";
import { X, Eye, Radio, TrendingUp, Clock, Tv, ExternalLink } from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";
import type { GameHistory } from "@/db/schema";
import type { GameWithMeta } from "@/lib/types";
import type { IgdbGame } from "@/lib/igdb";
import type { SteamInfo, SteamActivity } from "@/lib/steamspy";
import { trackTwitchLinkClick, trackSimilarGameClick } from "@/lib/analytics";

interface Props {
  game: GameWithMeta;
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

function buildHourMap(history: GameHistory[], getValue: (h: GameHistory) => number) {
  const hourMap: Record<number, { total: number; count: number }> = {};
  for (const h of history) {
    const jstHour = (new Date(h.recordedAt as unknown as string).getUTCHours() + 9) % 24;
    if (!hourMap[jstHour]) hourMap[jstHour] = { total: 0, count: 0 };
    hourMap[jstHour].total += getValue(h);
    hourMap[jstHour].count += 1;
  }
  return Object.entries(hourMap).map(([h, v]) => ({ hour: Number(h), avg: v.total / v.count }));
}

function hourLabel(hour: number): string {
  const end = (hour + 2) % 24;
  return `${String(hour).padStart(2, "0")}〜${String(end).padStart(2, "0")}時`;
}

function getPeakHint(history: GameHistory[]): string | null {
  if (history.length < 4) return null;
  const entries = buildHourMap(history, (h) => h.viewerCount).sort((a, b) => b.avg - a.avg);
  if (!entries.length) return null;
  const peak = entries[0].hour;
  const label = hourLabel(peak);
  if (peak >= 18) return `夜帯（${label}）に視聴者が集まりやすい`;
  if (peak >= 12) return `夕方帯（${label}）に視聴者が集まりやすい`;
  if (peak >= 6) return `朝〜昼帯（${label}）に視聴者が集まりやすい`;
  return `深夜帯（${label}）に視聴者が集まりやすい`;
}

function getLowCompetitorHint(history: GameHistory[]): string | null {
  if (history.length < 4) return null;
  const entries = buildHourMap(history, (h) => h.channelCount).sort((a, b) => a.avg - b.avg);
  if (!entries.length) return null;
  const low = entries[0].hour;
  const label = hourLabel(low);
  if (low >= 0 && low < 6) return `深夜帯（${label}）はライバルが最も少ない`;
  if (low >= 6 && low < 12) return `朝帯（${label}）はライバルが最も少ない`;
  if (low >= 12 && low < 18) return `昼帯（${label}）はライバルが最も少ない`;
  return `夕方〜夜帯（${label}）はライバルが最も少ない`;
}

function activityColor(activity: SteamActivity): string {
  if (activity === "very_active") return "text-emerald-400";
  if (activity === "active")      return "text-cyan-400";
  if (activity === "low")         return "text-yellow-400";
  return "text-slate-500";
}

export default function GameModal({ game, onClose }: Props) {
  const [history, setHistory] = useState<GameHistory[]>([]);
  const [similar, setSimilar] = useState<GameWithMeta[]>([]);
  const [igdb, setIgdb] = useState<IgdbGame | null | undefined>(undefined);
  const [steam, setSteam] = useState<SteamInfo | null | undefined>(undefined);

  useEffect(() => {
    setIgdb(undefined);
    setSteam(undefined);
    fetch(`/api/games/${game.id}/history`)
      .then((r) => r.json())
      .then((data: GameHistory[]) => setHistory(data))
      .catch(() => {});
    fetch(`/api/games/${game.id}/similar`)
      .then((r) => r.json())
      .then((data: GameWithMeta[]) => setSimilar(data))
      .catch(() => {});
    fetch(`/api/games/${game.id}/igdb`)
      .then((r) => r.json())
      .then((data: IgdbGame | null) => setIgdb(data))
      .catch(() => setIgdb(null));
    fetch(`/api/games/${game.id}/steam`)
      .then((r) => r.json())
      .then((data: SteamInfo | null) => setSteam(data))
      .catch(() => setSteam(null));
  }, [game.id]);

  const twitchUrl = `https://www.twitch.tv/directory/game/${encodeURIComponent(game.title)}`;

  const chartData = history.map((h) => ({
    time: formatTime(h.recordedAt as unknown as string),
    score: parseFloat(h.score.toFixed(2)),
    channels: h.channelCount,
  }));

  const peakHint = getPeakHint(history);
  const lowCompetitorHint = getLowCompetitorHint(history);

  return (
    <div
      className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-6 relative overflow-y-auto max-h-[90vh]"
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

        {/* IGDB ゲーム情報 */}
        {igdb && (
          <div className="mt-4 pt-4 border-t border-slate-700/50 space-y-2">
            {igdb.genres && igdb.genres.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {igdb.genres.map((g) => (
                  <span key={g.id} className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/15 text-purple-300 border border-purple-500/20">
                    {g.name}
                  </span>
                ))}
                {igdb.rating !== undefined && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/20 ml-auto">
                    ★ {igdb.rating.toFixed(0)} / 100
                  </span>
                )}
              </div>
            )}
            {igdb.summary && (
              <p className="text-xs text-slate-400 leading-relaxed line-clamp-3">
                {igdb.summary}
              </p>
            )}
          </div>
        )}

        {/* Steam データ */}
        {steam && (
          <div className="mt-3 flex items-center gap-3 px-3 py-2.5 bg-slate-800/60 border border-slate-700/50 rounded-lg">
            <span className="text-slate-300 text-xs font-bold shrink-0">Steam</span>
            <div className="flex-1 min-w-0 space-y-0.5">
              <p className="text-xs text-slate-300">所持者数: <span className="text-white font-semibold">{steam.ownerLabel}</span></p>
              <p className={`text-[11px] font-medium ${activityColor(steam.activity)}`}>{steam.activityLabel}</p>
            </div>
            <a
              href={`https://store.steampowered.com/app/${steam.appId}/`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-slate-500 hover:text-slate-300 transition-colors shrink-0"
            >
              <ExternalLink size={13} />
            </a>
          </div>
        )}

        {/* Twitch 配信リンク */}
        <a
          href={twitchUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => trackTwitchLinkClick(game.id, game.title)}
          className="mt-4 flex items-center justify-center gap-2 w-full py-2 rounded-lg bg-purple-600/20 border border-purple-500/40 text-purple-300 text-sm font-medium hover:bg-purple-600/30 transition-colors"
        >
          <ExternalLink size={14} />
          Twitch でこのゲームを配信する
        </a>

        {/* 配信時間帯ヒント */}
        {peakHint && (
          <div className="mt-4 flex items-start gap-2 bg-indigo-950/50 border border-indigo-500/30 rounded-lg px-3 py-2.5">
            <Tv size={13} className="text-indigo-400 mt-0.5 shrink-0" />
            <p className="text-xs text-indigo-300">{peakHint} <span className="text-indigo-500">(JST)</span></p>
          </div>
        )}

        {/* グラフ群 */}
        {chartData.length >= 2 ? (
          <div className="mt-4 pt-4 border-t border-slate-700/50 space-y-4">
            {/* 穴場スコア推移 */}
            <div>
              <p className="text-xs text-slate-400 mb-2">穴場スコア推移（直近24h）</p>
              <ResponsiveContainer width="100%" height={90}>
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
                    contentStyle={{ background: "#1e293b", border: "1px solid #334155", borderRadius: "8px", fontSize: "12px", color: "#e2e8f0" }}
                    labelStyle={{ color: "#94a3b8" }}
                    formatter={(v) => [v, "スコア"]}
                  />
                  <Line type="monotone" dataKey="score" stroke="#22d3ee" strokeWidth={2} dot={false} activeDot={{ r: 4, fill: "#22d3ee" }} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* ライバル配信者数推移 */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-slate-400">ライバル配信者数推移（直近24h）</p>
                {lowCompetitorHint && (
                  <span className="text-[10px] text-amber-400 font-medium">{lowCompetitorHint} (JST)</span>
                )}
              </div>
              <ResponsiveContainer width="100%" height={90}>
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
                    contentStyle={{ background: "#1e293b", border: "1px solid #334155", borderRadius: "8px", fontSize: "12px", color: "#e2e8f0" }}
                    labelStyle={{ color: "#94a3b8" }}
                    formatter={(v) => [v, "チャンネル数"]}
                  />
                  <Line type="monotone" dataKey="channels" stroke="#fb923c" strokeWidth={2} dot={false} activeDot={{ r: 4, fill: "#fb923c" }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        ) : (
          <div className="mt-4 pt-4 border-t border-slate-700/50">
            <p className="text-xs text-slate-500 text-center py-2">
              グラフはデータ蓄積後に表示されます（次回 Cron 実行以降）
            </p>
          </div>
        )}

        {/* 似たゲーム提案 */}
        {similar.length > 0 && (
          <div className="mt-4 pt-4 border-t border-slate-700/50">
            <p className="text-xs text-slate-400 mb-2">似たジャンルの穴場ゲーム</p>
            <div className="space-y-1.5">
              {similar.map((s) => (
                <button
                  key={s.id}
                  onClick={() => {
                    trackSimilarGameClick(game.id, s.id, s.title);
                    onClose();
                    setTimeout(() => {
                      window.dispatchEvent(new CustomEvent("playcastr:select", { detail: s }));
                    }, 150);
                  }}
                  className="flex items-center gap-3 w-full hover:bg-slate-800/60 rounded-lg px-2 py-1.5 transition-colors text-left"
                >
                  <img
                    src={s.boxArtUrl}
                    alt={s.title}
                    width={28}
                    height={37}
                    className="rounded shrink-0 object-cover"
                  />
                  <span className="flex-1 text-xs text-slate-300 truncate">{s.title}</span>
                  <span className="text-xs text-cyan-400 font-semibold shrink-0">
                    {s.score.toFixed(1)}
                  </span>
                </button>
              ))}
            </div>
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
