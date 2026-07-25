"use client";

import { useState, useEffect, useCallback } from "react";

const COOKIE_KEY = "playcastr_watchlist";
const LS_KEY = "playcastr:watchlist";
const MAX_AGE = 60 * 60 * 24 * 365; // 1 year

function readCookie(): Set<string> {
  if (typeof document === "undefined") return new Set();
  try {
    const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${COOKIE_KEY}=([^;]*)`));
    if (!match) return new Set();
    return new Set(JSON.parse(decodeURIComponent(match[1])) as string[]);
  } catch {
    return new Set();
  }
}

function writeCookie(ids: Set<string>): void {
  if (typeof document === "undefined") return;
  try {
    document.cookie = `${COOKIE_KEY}=${encodeURIComponent(
      JSON.stringify([...ids])
    )}; max-age=${MAX_AGE}; path=/; SameSite=Lax`;
  } catch {}
}

export function useWatchlist() {
  const [ids, setIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    // localStorage から cookie へ移行
    try {
      const stored = localStorage.getItem(LS_KEY);
      if (stored) {
        const migrated = new Set(JSON.parse(stored) as string[]);
        writeCookie(migrated);
        localStorage.removeItem(LS_KEY);
        setIds(migrated);
        return;
      }
    } catch {}
    setIds(readCookie());
  }, []);

  const toggle = useCallback((id: string) => {
    setIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      writeCookie(next);
      return next;
    });
  }, []);

  const has = useCallback((id: string) => ids.has(id), [ids]);

  return { ids, toggle, has, count: ids.size };
}
