import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { games } from "@/db/schema";
import { eq } from "drizzle-orm";
import { fetchIgdbGame } from "@/lib/igdb";
import { fetchSteamSpyData, getSteamAppId, formatOwners, classifyActivity } from "@/lib/steamspy";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const rows = await db.select({ title: games.title }).from(games).where(eq(games.id, id)).limit(1);
  if (!rows.length) return NextResponse.json(null);

  const igdb = await fetchIgdbGame(rows[0].title);
  const steamAppId = getSteamAppId(igdb?.external_games);
  if (!steamAppId) return NextResponse.json(null);

  const spy = await fetchSteamSpyData(steamAppId);
  if (!spy) return NextResponse.json(null);

  const { activity, label: activityLabel } = classifyActivity(spy.average_2weeks);

  return NextResponse.json(
    {
      appId: steamAppId,
      owners: spy.owners,
      ownerLabel: formatOwners(spy.owners),
      average2weeks: spy.average_2weeks,
      averageForever: spy.average_forever,
      activity,
      activityLabel,
    },
    { headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=1800" } }
  );
}
