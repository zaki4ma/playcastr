import type { Game } from "@/db/schema";

export type GameWithMeta = Game & {
  scoreDelta: number | null;
};
