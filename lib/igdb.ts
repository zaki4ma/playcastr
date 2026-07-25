import { getAppAccessToken } from "./twitch";

const IGDB_BASE = "https://api.igdb.com/v4";

export type IgdbGame = {
  id: number;
  name: string;
  summary?: string;
  rating?: number;
  genres?: { id: number; name: string }[];
  external_games?: { uid: string; category: number }[];
  alternative_names?: { name: string; comment?: string }[];
};

export function extractJapaneseName(game: IgdbGame): string | null {
  if (!game.alternative_names?.length) return null;
  const ja = game.alternative_names.find(
    (n) =>
      n.comment?.toLowerCase().includes("japan") ||
      /[぀-ヿ]/.test(n.name) // ひらがな・カタカナのみ（中国語を除外）
  );
  return ja?.name ?? null;
}

export async function fetchIgdbGame(title: string): Promise<IgdbGame | null> {
  const token = await getAppAccessToken();
  const clientId = process.env.TWITCH_CLIENT_ID!;

  const escapedTitle = title.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  const body = `search "${escapedTitle}"; fields name, summary, rating, genres.name, external_games.uid, external_games.category, alternative_names.name, alternative_names.comment; limit 1;`;

  const res = await fetch(`${IGDB_BASE}/games`, {
    method: "POST",
    headers: {
      "Client-ID": clientId,
      Authorization: `Bearer ${token}`,
      "Content-Type": "text/plain",
    },
    body,
    next: { revalidate: 86400 }, // 24h キャッシュ
  });

  if (!res.ok) return null;
  const data = await res.json() as IgdbGame[];
  return data[0] ?? null;
}
