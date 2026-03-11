import type { Timestamp } from "@google-cloud/firestore";

export const TRACKING_POINTS = [
  "Gratitude and Awareness",
  "Mindfulness",
  "Intelligence",
  "Cool",
  "Technical Ability",
  "Physical Presence",
] as const;

/** Default hero stats when no entries exist */
export const DEFAULT_HERO_STATS: Record<TrackingPointId, number> = {
  "Gratitude and Awareness": 17,
  Mindfulness: 55,
  Intelligence: 36,
  Cool: 67,
  "Technical Ability": 90,
  "Physical Presence": 64,
};

/**
 * Z-depth by value in today's world (higher = front/closer).
 * Technical & Intelligence lead; Gratitude/Mindfulness are foundational but less "market" valued.
 */
export const POINT_Z_DEPTH: Record<TrackingPointId, number> = {
  "Technical Ability": 0.28, // Tech economy, AI, remote work
  Intelligence: 0.22, // Problem-solving, adaptability
  "Physical Presence": 0.12, // Health, energy, executive presence
  Cool: 0.02, // Personal brand, influence
  Mindfulness: -0.12, // Wellness, focus
  "Gratitude and Awareness": -0.22, // Emotional intelligence, foundational
};

/** Color per tracking point for graph variation */
export const POINT_COLORS: Record<TrackingPointId, string> = {
  "Gratitude and Awareness": "#f472b6", // pink
  Mindfulness: "#22d3ee", // cyan
  Intelligence: "#a78bfa", // violet
  Cool: "#60a5fa", // blue
  "Technical Ability": "#f97316", // orange
  "Physical Presence": "#fbbf24", // amber
};

export type TrackingPointId = (typeof TRACKING_POINTS)[number];

export interface PointScore {
  pointId: TrackingPointId;
  score: number; // 0-100
  rationale?: string;
}

export interface LifeUpdateEntry {
  id: string;
  headline: string;
  narrative: string;
  date: string; // ISO date
  scores: PointScore[];
  rawInput: string;
}

export interface LifeUpdateDoc {
  headline: string;
  narrative: string;
  date: string;
  scores: PointScore[];
  rawInput: string;
  createdAt: Timestamp;
}

export interface PointStats {
  pointId: TrackingPointId;
  heroStat: number; // 0-100 current value
  trendline: number[]; // last N values for trend
  entries: LifeUpdateEntry[];
}
