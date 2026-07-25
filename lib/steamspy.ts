const STEAM_CATEGORY = 1; // IGDB external_games category for Steam

export type SteamSpyData = {
  appid: number;
  name: string;
  owners: string;       // "1,000,000 .. 2,000,000"
  average_2weeks: number; // avg playtime in minutes over last 2 weeks
  average_forever: number; // avg playtime in minutes overall
};

export type SteamActivity = "very_active" | "active" | "low" | "inactive";

export type SteamInfo = {
  appId: string;
  owners: string;
  ownerLabel: string;
  average2weeks: number;
  averageForever: number;
  activity: SteamActivity;
  activityLabel: string;
};

export function getSteamAppId(
  externalGames?: { uid: string; category: number }[]
): string | null {
  return externalGames?.find((e) => e.category === STEAM_CATEGORY)?.uid ?? null;
}

export function formatOwners(owners: string): string {
  const upper = parseInt(owners.split(" .. ")[1]?.replace(/,/g, "") ?? "0");
  if (upper >= 100_000_000) return `〜${(upper / 100_000_000).toFixed(0)}億人`;
  if (upper >= 10_000_000) return `〜${(upper / 10_000_000).toFixed(0)}千万人`;
  if (upper >= 10_000) return `〜${(upper / 10_000).toFixed(0)}万人`;
  return `〜${upper.toLocaleString("ja-JP")}人`;
}

export function classifyActivity(avg2weeks: number): { activity: SteamActivity; label: string } {
  if (avg2weeks >= 120) return { activity: "very_active", label: "直近2週間: 活発にプレイ中" };
  if (avg2weeks >= 30)  return { activity: "active",      label: "直近2週間: プレイされている" };
  if (avg2weeks > 0)    return { activity: "low",         label: "直近2週間: 少数がプレイ中" };
  return                       { activity: "inactive",    label: "直近2週間: ほぼ非アクティブ" };
}

export async function fetchSteamSpyData(appId: string): Promise<SteamSpyData | null> {
  try {
    const res = await fetch(
      `https://steamspy.com/api.php?request=appdetails&appid=${appId}`,
      { next: { revalidate: 3600 } }
    );
    if (!res.ok) return null;
    const data = await res.json() as SteamSpyData;
    if (!data.appid) return null;
    return data;
  } catch {
    return null;
  }
}
