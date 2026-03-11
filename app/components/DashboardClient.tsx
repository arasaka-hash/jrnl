"use client";

import dynamic from "next/dynamic";
import { useState, useCallback } from "react";
import { fetchLifeUpdates } from "@/app/actions/life-updates";
import { InputPanel } from "@/app/components/InputPanel";

const SpiderGraph = dynamic(
  () => import("@/app/components/SpiderGraph").then((m) => ({ default: m.SpiderGraph })),
  { ssr: false }
);
import { TerminalNode } from "@/app/components/TerminalNode";
import type {
  PointStats,
  TrackingPointId,
  LifeUpdateEntry,
} from "@/lib/types";
import { TRACKING_POINTS, DEFAULT_HERO_STATS } from "@/lib/types";

function computeStatsMap(
  entries: LifeUpdateEntry[]
): Map<TrackingPointId, PointStats> {
  const map = new Map<TrackingPointId, PointStats>();

  for (const pointId of TRACKING_POINTS) {
    const pointEntries = entries
      .map((e) => {
        const score = e.scores.find((s) => s.pointId === pointId);
        return { ...e, score: score?.score ?? 50 };
      })
      .filter((e) => e.score !== undefined)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const trendline = pointEntries
      .slice(0, 10)
      .reverse()
      .map((e) => e.score);

    const heroStat =
      pointEntries.length > 0
        ? Math.round(
            pointEntries.slice(0, 5).reduce((s, e) => s + e.score, 0) /
              Math.min(5, pointEntries.length)
          )
        : DEFAULT_HERO_STATS[pointId];

    map.set(pointId, {
      pointId,
      heroStat: Math.min(100, Math.max(0, heroStat)),
      trendline,
      entries: pointEntries.map(({ score, ...rest }) => rest),
    });
  }

  return map;
}

export interface DashboardClientProps {
  initialEntries: LifeUpdateEntry[];
}

export function DashboardClient({ initialEntries }: DashboardClientProps) {
  const [entries, setEntries] = useState<LifeUpdateEntry[]>(initialEntries);
  const [selectedPoint, setSelectedPoint] = useState<TrackingPointId | null>(
    null
  );

  const statsMap = computeStatsMap(entries);

  const refresh = useCallback(async () => {
    const data = await fetchLifeUpdates();
    setEntries(data);
  }, []);

  return (
    <div className="relative min-h-screen flex flex-col lg:flex-row">
      {/* Left: Input panel - always visible */}
      <div className="w-full lg:w-80 xl:w-96 shrink-0 p-4 lg:p-6">
        <InputPanel onSubmitted={refresh} />
      </div>

      {/* Right: Spider graph - always visible */}
      <div className="flex-1 min-h-[400px] p-4 lg:p-6 flex flex-col">
        <div className="flex-1 min-h-[400px]">
          <SpiderGraph
            statsMap={statsMap}
            onPointClick={setSelectedPoint}
          />
        </div>
      </div>

      {/* Terminal overlay when point selected */}
      {selectedPoint && (
        <div
          className="fixed inset-0 bg-black/60 z-10 flex items-center justify-center"
          onClick={() => setSelectedPoint(null)}
        >
          <div onClick={(e) => e.stopPropagation()}>
            <TerminalNode
              pointId={selectedPoint}
              stats={statsMap.get(selectedPoint) ?? null}
              onClose={() => setSelectedPoint(null)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
