import { RANK_TIERS, type RankTier } from "@/lib/rating/rank";
import type { Json } from "@/lib/supabase/database.types";

/** Everything printed on a build poster. */
export interface PosterData {
  /** "1966 Ford Mustang Coupe" */
  carName: string;
  nickname: string | null;
  username: string;
  score: number;
  tier: RankTier;
  subscores: PosterSubscores | null;
  ratedAt: string | null;
}

export interface PosterSubscores {
  appearance: number;
  performance: number;
  wheelsFitment: number;
  interior: number;
  modifications: number;
}

/** What an order fixes when it's placed: the poster's data plus the
 * cover photo's storage path, so the print shows what was bought even
 * if the car is re-rated or re-photographed before it ships. */
export interface PosterSnapshot extends PosterData {
  photoPath: string;
}

export const SUBSCORE_KEYS: (keyof PosterSubscores)[] = ["appearance", "performance", "wheelsFitment", "interior", "modifications"];

/** The subscores as the rating stored them, or null if any are missing:
 * a poster never prints a category it doesn't have a real score for. */
export function posterSubscores(raw: unknown): PosterSubscores | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const out = {} as PosterSubscores;
  for (const key of SUBSCORE_KEYS) {
    const v = r[key];
    if (typeof v !== "number" || !Number.isFinite(v)) return null;
    out[key] = v;
  }
  return out;
}

const TIERS = new Set<string>(RANK_TIERS.map((t) => t.tier));

/** Reads an order's snapshot back from the database, or null if it
 * isn't one: a malformed row fails the order rather than printing junk. */
export function parsePosterSnapshot(raw: Json): PosterSnapshot | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const r = raw as Record<string, Json | undefined>;
  if (typeof r.carName !== "string" || !r.carName) return null;
  if (typeof r.username !== "string" || !r.username) return null;
  if (typeof r.score !== "number" || !Number.isFinite(r.score)) return null;
  if (typeof r.tier !== "string" || !TIERS.has(r.tier)) return null;
  if (typeof r.photoPath !== "string" || !r.photoPath) return null;
  return {
    carName: r.carName,
    nickname: typeof r.nickname === "string" && r.nickname ? r.nickname : null,
    username: r.username,
    score: r.score,
    tier: r.tier as RankTier,
    subscores: posterSubscores(r.subscores),
    ratedAt: typeof r.ratedAt === "string" ? r.ratedAt : null,
    photoPath: r.photoPath,
  };
}

/** A snapshot as the jsonb the order row stores. */
export function posterSnapshotJson(s: PosterSnapshot): Json {
  return {
    carName: s.carName,
    nickname: s.nickname,
    username: s.username,
    score: s.score,
    tier: s.tier,
    subscores: s.subscores ? { ...s.subscores } : null,
    ratedAt: s.ratedAt,
    photoPath: s.photoPath,
  };
}
