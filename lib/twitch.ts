const TWITCH_AUTH_URL = "https://id.twitch.tv/oauth2/token";
const TWITCH_API_BASE = "https://api.twitch.tv/helix";

let cachedToken: { access_token: string; expires_at: number } | null = null;

async function getAppAccessToken(): Promise<string> {
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
    // 余裕を持って60秒早めに期限切れ扱い
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
}

export async function fetchTopGames(): Promise<TwitchGame[]> {
  const token = await getAppAccessToken();
  const clientId = process.env.TWITCH_CLIENT_ID!;

  // まずトップゲームリストを取得（最大100件）
  const gamesRes = await fetch(`${TWITCH_API_BASE}/games/top?first=100`, {
    headers: {
      "Client-ID": clientId,
      Authorization: `Bearer ${token}`,
    },
  });
  if (!gamesRes.ok) throw new Error(`Failed to fetch top games: ${gamesRes.status}`);
  const gamesData = await gamesRes.json();

  // 各ゲームのストリーム情報を取得してviewer_count/channel_countを集計
  const gameIds: string[] = gamesData.data.map((g: { id: string }) => g.id);
  const streamCounts: Record<string, { viewers: number; channels: number }> = {};

  // ゲームIDを25件ずつに分割してストリーム情報を取得
  for (let i = 0; i < gameIds.length; i += 25) {
    const chunk = gameIds.slice(i, i + 25);
    const params = chunk.map((id) => `game_id=${id}`).join("&");
    const streamsRes = await fetch(
      `${TWITCH_API_BASE}/streams?first=100&${params}`,
      {
        headers: {
          "Client-ID": clientId,
          Authorization: `Bearer ${token}`,
        },
      }
    );
    if (!streamsRes.ok) continue;
    const streamsData = await streamsRes.json();

    for (const stream of streamsData.data) {
      if (!streamCounts[stream.game_id]) {
        streamCounts[stream.game_id] = { viewers: 0, channels: 0 };
      }
      streamCounts[stream.game_id].viewers += stream.viewer_count;
      streamCounts[stream.game_id].channels += 1;
    }
  }

  return gamesData.data.map((game: { id: string; name: string; box_art_url: string }) => {
    const counts = streamCounts[game.id] ?? { viewers: 0, channels: 0 };
    return {
      id: game.id,
      name: game.name,
      box_art_url: game.box_art_url
        .replace("{width}", "144")
        .replace("{height}", "192"),
      viewer_count: counts.viewers,
      channel_count: counts.channels,
    };
  });
}
