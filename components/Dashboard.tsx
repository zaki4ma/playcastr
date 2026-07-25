"use client";

import { useState, useEffect, useCallback } from "react";
import { Search, ArrowUpDown, Tag, X, List, BarChart2, Bookmark } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useWatchlist } from "@/hooks/useWatchlist";
import { trackSortChange, trackTagFilter } from "@/lib/analytics";
import type { GameWithMeta } from "@/lib/types";
import GameCard from "./GameCard";
import GameModal from "./GameModal";
import TopTen from "./TopTen";
import TrendingSidebar from "./TrendingSidebar";

type SortKey = "score" | "viewers" | "channels" | "momentum";
type BadgeFilter = "" | "chance" | "hot" | "rising" | "weekly";

const BADGE_OPTIONS: { value: BadgeFilter; label: string; className: string }[] = [
  { value: "chance", label: "⚡ チャンス",  className: "bg-emerald-500/20 text-emerald-400 border-emerald-500/50" },
  { value: "hot",    label: "🔥 今が熱い",  className: "bg-orange-500/20 text-orange-400 border-orange-500/50" },
  { value: "rising", label: "↑ 上昇中",    className: "bg-yellow-500/20 text-yellow-400 border-yellow-500/50" },
  { value: "weekly", label: "📈 週間上昇",  className: "bg-purple-500/20 text-purple-400 border-purple-500/50" },
];

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "score", label: "穴場スコア順" },
  { value: "momentum", label: "🚀 急上昇（配信者増加）" },
  { value: "viewers", label: "視聴者数順" },
  { value: "channels", label: "チャンネル数順" },
];

type TrendingGame = GameWithMeta & { pctChange: number };

export default function Dashboard() {
  const [games, setGames] = useState<GameWithMeta[]>([]);
  const [trending, setTrending] = useState<TrendingGame[]>([]);
  const [sort, setSort] = useState<SortKey>("score");
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [selectedTag, setSelectedTag] = useState("");
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const [selected, setSelected] = useState<GameWithMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [watchlistOnly, setWatchlistOnly] = useState(false);
  const [selectedBadge, setSelectedBadge] = useState<BadgeFilter>("");
  const { has: isWatched, toggle: toggleWatch, count: watchlistCount } = useWatchlist();

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query), 300);
    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => {
    fetch("/api/tags")
      .then((r) => r.json())
      .then((tags: string[]) => setAvailableTags(tags))
      .catch(() => {});
    fetch("/api/games/trending")
      .then((r) => r.json())
      .then((data: TrendingGame[]) => setTrending(data))
      .catch(() => {});
  }, []);

  const fetchGames = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ sort });
      if (debouncedQuery) params.set("q", debouncedQuery);
      if (selectedTag) params.set("tag", selectedTag);
      const res = await fetch(`/api/games?${params}`);
      const data: GameWithMeta[] = await res.json();
      setGames(data);
      // スコア1位ではなく全ゲーム中で最も新しい updatedAt を最終更新とする
      const latestTs = data.reduce((max, g) => {
        const t = g.updatedAt ? new Date(g.updatedAt).getTime() : 0;
        return t > max ? t : max;
      }, 0);
      if (latestTs > 0) setLastUpdated(new Date(latestTs));
    } finally {
      setLoading(false);
    }
  }, [sort, debouncedQuery, selectedTag]);

  useEffect(() => {
    fetchGames();
  }, [fetchGames]);

  useEffect(() => {
    const handler = (e: Event) => {
      setSelected((e as CustomEvent<GameWithMeta>).detail);
    };
    window.addEventListener("playcastr:select", handler);
    return () => window.removeEventListener("playcastr:select", handler);
  }, []);

  const badgeFiltered = games.filter((g) => {
    if (!selectedBadge) return true;
    const d = g.scoreDelta;
    if (d === null) return false;
    const prev = g.score - d;
    const pct = prev > 0 ? (d / prev) * 100 : null;
    if (selectedBadge === "chance") return d > 0 && g.channelCount < 50;
    if (selectedBadge === "hot")    return pct !== null && pct >= 15;
    if (selectedBadge === "rising") return d > 0;
    if (selectedBadge === "weekly") return g.weeklyDelta !== null && g.weeklyDelta > 0;
    return true;
  });
  const displayedGames = watchlistOnly ? badgeFiltered.filter((g) => isWatched(g.id)) : badgeFiltered;
  const isDefaultView = !debouncedQuery && !selectedTag && !selectedBadge && sort === "score" && !watchlistOnly;

  return (
    <div className="min-h-screen bg-[#0f0f1a] text-slate-100">
      <header className="border-b border-slate-800 px-6 py-4">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Image src="/logo.png" alt="PlayCastr" width={40} height={40} />
              <div>
                <h1 className="text-xl font-bold text-white">
                  <span className="text-purple-400">Play</span>
                  <span className="text-cyan-400">Castr</span>
                </h1>
                <p className="text-xs text-slate-500 mt-0.5">
                  穴場ゲームダッシュボード for Streamers（配信者）
                </p>
              </div>
            </div>
            <Link
              href="/weekly"
              className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-cyan-400 transition-colors"
            >
              <BarChart2 size={14} />
              週次レポート
            </Link>
          </div>
        </div>
      </header>

      <div className="border-b border-slate-800/50 bg-gradient-to-r from-purple-950/30 via-transparent to-cyan-950/30 py-2.5 text-center text-sm text-slate-400">
        視聴者は多い、配信ライバルは少ない——<span className="text-purple-300 font-medium">穴場ゲーム</span>をスコアで即発見。
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="flex flex-col lg:flex-row gap-6">

          {/* メインコンテンツ */}
          <main className="flex-1 min-w-0 space-y-4">
            {/* 検索 + ソート */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  placeholder="ゲームを検索..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 bg-slate-800/60 border border-slate-700 rounded-lg text-sm placeholder:text-slate-500 focus:outline-none focus:border-purple-500 transition-colors"
                />
              </div>
              <div className="relative">
                <ArrowUpDown size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                <select
                  value={sort}
                  onChange={(e) => { const s = e.target.value as SortKey; trackSortChange(s); setSort(s); }}
                  className="pl-8 pr-4 py-2.5 bg-slate-800/60 border border-slate-700 rounded-lg text-sm focus:outline-none focus:border-purple-500 transition-colors appearance-none cursor-pointer"
                >
                  {SORT_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* ウォッチリストフィルター */}
            <button
              onClick={() => setWatchlistOnly((v) => !v)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                watchlistOnly
                  ? "bg-cyan-600/30 border border-cyan-500/50 text-cyan-300"
                  : "bg-slate-800/60 border border-slate-700 text-slate-400 hover:text-slate-200"
              }`}
            >
              <Bookmark size={12} fill={watchlistOnly ? "currentColor" : "none"} />
              ウォッチリスト
              {watchlistCount > 0 && (
                <span className={`ml-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                  watchlistOnly ? "bg-cyan-500/30 text-cyan-300" : "bg-slate-700 text-slate-300"
                }`}>
                  {watchlistCount}
                </span>
              )}
            </button>

            {/* バッジフィルター */}
            <div className="flex items-center gap-2 flex-wrap">
              {BADGE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setSelectedBadge(selectedBadge === opt.value ? "" : opt.value)}
                  className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-all ${
                    selectedBadge === opt.value
                      ? opt.className
                      : "bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700 hover:text-slate-200"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {/* タグフィルター */}
            {availableTags.length > 0 && (
              <div className="flex items-center gap-2 flex-wrap">
                <Tag size={13} className="text-slate-500 shrink-0" />
                {availableTags.map((tag) => (
                  <button
                    key={tag}
                    onClick={() => { const next = selectedTag === tag ? "" : tag; if (next) trackTagFilter(next); setSelectedTag(next); }}
                    className={`px-2.5 py-1 rounded-full text-xs font-medium transition-all ${
                      selectedTag === tag
                        ? "bg-purple-600 text-white"
                        : "bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-slate-200"
                    }`}
                  >
                    {tag}
                  </button>
                ))}
                {selectedTag && (
                  <button
                    onClick={() => setSelectedTag("")}
                    className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-300 ml-1"
                  >
                    <X size={11} />
                    解除
                  </button>
                )}
              </div>
            )}

            {/* ゲーム一覧 */}
            {loading ? (
              <div className="space-y-3">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="h-20 bg-slate-800/40 rounded-xl animate-pulse" />
                ))}
              </div>
            ) : displayedGames.length === 0 ? (
              <div className="text-center py-20 text-slate-500">
                {watchlistOnly
                  ? "ウォッチリストは空です。カードの ☆ から追加できます。"
                  : debouncedQuery || selectedTag
                  ? "条件に一致するゲームはありません"
                  : "データがありません。Cron を実行してください。"}
              </div>
            ) : (
              <div className="space-y-6">
                {isDefaultView && displayedGames.length >= 3 && (
                  <TopTen games={displayedGames} onSelect={setSelected} />
                )}
                <div className="space-y-1">
                  {isDefaultView && (
                    <div className="flex items-center gap-2 mb-3">
                      <List size={14} className="text-slate-500" />
                      <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        全ランキング
                      </span>
                    </div>
                  )}
                  {displayedGames.map((game, i) => (
                    <GameCard
                      key={game.id}
                      game={game}
                      rank={i + 1}
                      onClick={setSelected}
                      isWatched={isWatched(game.id)}
                      onToggleWatch={toggleWatch}
                    />
                  ))}
                </div>
              </div>
            )}
          </main>

          {/* 右サイドバー */}
          <div className="lg:w-72 shrink-0">
            <TrendingSidebar
              trending={trending}
              onSelect={setSelected}
              lastUpdated={lastUpdated}
            />
          </div>

        </div>
      </div>

      <footer className="border-t border-slate-800 px-6 py-4 mt-8">
        <div className="max-w-6xl mx-auto flex items-center justify-between text-xs text-slate-600">
          <span>© 2026 PlayCastr</span>
          <div className="flex items-center gap-4">
            <a
              href="https://docs.google.com/forms/d/e/1FAIpQLScUXUXb8E8tb9p-Sc5lyJqwFVqaDVhlyMAjMA7lRS9fVaj6XA/viewform"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-slate-400 transition-colors"
            >
              お問い合わせ
            </a>
            <Link href="/privacy" className="hover:text-slate-400 transition-colors">
              プライバシーポリシー
            </Link>
          </div>
        </div>
      </footer>

      {selected && (
        <GameModal game={selected} onClose={() => setSelected(null)} />
      )}
    </div>
  );
}
