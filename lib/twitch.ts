const TWITCH_AUTH_URL = "https://id.twitch.tv/oauth2/token";
const TWITCH_API_BASE = "https://api.twitch.tv/helix";

let cachedToken: { access_token: string; expires_at: number } | null = null;

export async function getAppAccessToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expires_at) {
    return cachedToken.access_token;
  }

  const res = await fetch(TWITCH_AUTH_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.TWITCH_CLIENT_ID!,
      client_secret: process.env.TWITCH_CLIENT_SECRET!,
      grant_type: "client_credentials",
    }),
  });

  if (!res.ok) throw new Error(`Twitch auth failed: ${res.status}`);

  const data = await res.json();
  cachedToken = {
    access_token: data.access_token,
    expires_at: Date.now() + (data.expires_in - 60) * 1000,
  };
  return cachedToken.access_token;
}

export interface TwitchGame {
  id: string;
  name: string;
  box_art_url: string;
  viewer_count: number;
  channel_count: number;
  tags: string[];
}

export async function fetchTopGames(): Promise<TwitchGame[]> {
  const token = await getAppAccessToken();
  const clientId = process.env.TWITCH_CLIENT_ID!;

  // 日本語ストリームを視聴者数順に最大500件取得（5ページ×100件）
  const streamCounts: Record<string, { viewers: number; channels: number; tagFreq: Record<string, number> }> = {};
  let cursor: string | undefined;

  for (let page = 0; page < 2; page++) {
    const url = new URL(`${TWITCH_API_BASE}/streams`);
    url.searchParams.set("first", "100");
    url.searchParams.set("language", "ja");
    if (cursor) url.searchParams.set("after", cursor);

    const streamsRes = await fetch(url.toString(), {
      headers: { "Client-ID": clientId, Authorization: `Bearer ${token}` },
    });
    if (!streamsRes.ok) break;
    const streamsData = await streamsRes.json();

    for (const stream of streamsData.data) {
      if (!stream.game_id) continue;
      if (!streamCounts[stream.game_id]) {
        streamCounts[stream.game_id] = { viewers: 0, channels: 0, tagFreq: {} };
      }
      streamCounts[stream.game_id].viewers += stream.viewer_count;
      streamCounts[stream.game_id].channels += 1;
      for (const tag of stream.tags ?? []) {
        streamCounts[stream.game_id].tagFreq[tag] =
          (streamCounts[stream.game_id].tagFreq[tag] ?? 0) + 1;
      }
    }

    cursor = streamsData.pagination?.cursor;
    if (!cursor || streamsData.data.length === 0) break;
  }

  const gameIds = Object.keys(streamCounts);
  if (gameIds.length === 0) return [];

  // ゲームIDからゲーム情報を取得（100件ずつ）
  const gameMap: Record<string, { name: string; box_art_url: string }> = {};
  for (let i = 0; i < gameIds.length; i += 100) {
    const chunk = gameIds.slice(i, i + 100);
    const params = chunk.map((id) => `id=${id}`).join("&");
    const gamesRes = await fetch(`${TWITCH_API_BASE}/games?${params}`, {
      headers: { "Client-ID": clientId, Authorization: `Bearer ${token}` },
    });
    if (!gamesRes.ok) continue;
    const gamesData = await gamesRes.json();
    for (const g of gamesData.data) {
      gameMap[g.id] = g;
    }
  }

  return gameIds
    .filter((id) => gameMap[id])
    .map((id) => {
      const counts = streamCounts[id];
      const game = gameMap[id];
      const topTags = Object.entries(counts.tagFreq)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([tag]) => tag);
      return {
        id,
        name: game.name,
        box_art_url: game.box_art_url
          .replace("{width}", "144")
          .replace("{height}", "192"),
        viewer_count: counts.viewers,
        channel_count: counts.channels,
        tags: topTags,
      };
    });
}
