"use client";

import { useState, useEffect, useCallback } from "react";
import { Search, ArrowUpDown, Tag, X, List } from "lucide-react";
import type { GameWithMeta } from "@/lib/types";
import GameCard from "./GameCard";
import GameModal from "./GameModal";
import TopTen from "./TopTen";
import TrendingSidebar from "./TrendingSidebar";

type SortKey = "score" | "viewers" | "channels";

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "score", label: "穴場スコア順" },
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
      if (data.length > 0 && data[0].updatedAt) {
        setLastUpdated(new Date(data[0].updatedAt));
      }
    } finally {
      setLoading(false);
    }
  }, [sort, debouncedQuery, selectedTag]);

  useEffect(() => {
    fetchGames();
  }, [fetchGames]);

  const isDefaultView = !debouncedQuery && !selectedTag && sort === "score";

  return (
    <div className="min-h-screen bg-[#0f0f1a] text-slate-100">
      <header className="border-b border-slate-800 px-6 py-4">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-xl font-bold text-white">
            <span className="text-purple-400">Play</span>
            <span className="text-cyan-400">Castr</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            穴場ゲームダッシュボード for Streamers
          </p>
        </div>
      </header>

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
                  onChange={(e) => setSort(e.target.value as SortKey)}
                  className="pl-8 pr-4 py-2.5 bg-slate-800/60 border border-slate-700 rounded-lg text-sm focus:outline-none focus:border-purple-500 transition-colors appearance-none cursor-pointer"
                >
                  {SORT_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* タグフィルター */}
            {availableTags.length > 0 && (
              <div className="flex items-center gap-2 flex-wrap">
                <Tag size={13} className="text-slate-500 shrink-0" />
                {availableTags.map((tag) => (
                  <button
                    key={tag}
                    onClick={() => setSelectedTag(selectedTag === tag ? "" : tag)}
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
            ) : games.length === 0 ? (
              <div className="text-center py-20 text-slate-500">
                {debouncedQuery || selectedTag
                  ? "条件に一致するゲームはありません"
                  : "データがありません。Cron を実行してください。"}
              </div>
            ) : (
              <div className="space-y-6">
                {isDefaultView && games.length >= 3 && (
                  <TopTen games={games} onSelect={setSelected} />
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
                  {games.map((game, i) => (
                    <GameCard key={game.id} game={game} rank={i + 1} onClick={setSelected} />
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

      {selected && (
        <GameModal game={selected} onClose={() => setSelected(null)} />
      )}
    </div>
  );
}
