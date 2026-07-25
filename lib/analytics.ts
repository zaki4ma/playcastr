import { sendGAEvent } from "@next/third-parties/google";

export function trackGameCardClick(
  gameId: string,
  gameTitle: string,
  score: number,
  source: "main_list" | "top10_podium" | "top10_list" | "trending"
) {
  sendGAEvent("event", "game_card_click", {
    game_id: gameId,
    game_title: gameTitle,
    game_score: Math.round(score),
    source,
  });
}

export function trackWatchlistToggle(
  gameId: string,
  gameTitle: string,
  action: "add" | "remove"
) {
  sendGAEvent("event", "watchlist_toggle", {
    game_id: gameId,
    game_title: gameTitle,
    action,
  });
}

export function trackTwitchLinkClick(gameId: string, gameTitle: string) {
  sendGAEvent("event", "twitch_link_click", {
    game_id: gameId,
    game_title: gameTitle,
  });
}

export function trackSimilarGameClick(
  fromGameId: string,
  toGameId: string,
  toGameTitle: string
) {
  sendGAEvent("event", "similar_game_click", {
    from_game_id: fromGameId,
    to_game_id: toGameId,
    to_game_title: toGameTitle,
  });
}

export function trackSortChange(sort: string) {
  sendGAEvent("event", "sort_change", { sort });
}

export function trackTagFilter(tag: string) {
  sendGAEvent("event", "tag_filter", { tag });
}
