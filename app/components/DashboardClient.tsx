"use client";

import dynamic from "next/dynamic";
import { useState, useCallback, useEffect } from "react";
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

  const legacyPointIds: Record<string, string> = {
    "Love and Awareness": "Gratitude and Awareness",
  };

  for (const pointId of TRACKING_POINTS) {
    const pointEntries = entries
      .map((e) => {
        const scoreObj = e.scores.find(
          (s) =>
            s.pointId === pointId ||
            s.pointId === legacyPointIds[pointId]
        );
        const score = scoreObj?.score ?? 50;
        return { ...e, score, scoreObj };
      })
      .filter((e) => e.score !== undefined && e.score !== 50)
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
      entries: pointEntries.map(({ score, scoreObj, ...rest }) => rest),
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

  useEffect(() => {
    setEntries(initialEntries);
  }, [initialEntries]);

  const statsMap = computeStatsMap(entries);

  const refresh = useCallback(async () => {
    // #region agent log
    fetch('http://127.0.0.1:7384/ingest/a6f14ac3-126a-4fd8-96cb-f88dd4ec32e1',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'f064e3'},body:JSON.stringify({sessionId:'f064e3',location:'DashboardClient.tsx:refresh:start',message:'refresh called',data:{},timestamp:Date.now(),hypothesisId:'H5'})}).catch(()=>{});
    // #endregion
    const data = await fetchLifeUpdates();
    // #region agent log
    fetch('http://127.0.0.1:7384/ingest/a6f14ac3-126a-4fd8-96cb-f88dd4ec32e1',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'f064e3'},body:JSON.stringify({sessionId:'f064e3',location:'DashboardClient.tsx:refresh:done',message:'fetchLifeUpdates done',data:{count:data.length,lastEntry:data[data.length-1]?.headline,lastScores:data[data.length-1]?.scores?.map(s=>({p:s.pointId,sc:s.score}))},timestamp:Date.now(),hypothesisId:'H5'})}).catch(()=>{});
    // #endregion
    setEntries(data);
  }, []);

  return (
    <div className="relative min-h-screen flex flex-col-reverse lg:flex-row">
      {/* On mobile: below graph. On lg+: left */}
      <div className="w-full lg:w-80 xl:w-96 shrink-0 p-4 lg:p-6">
        <InputPanel onSubmitted={refresh} />
      </div>

      {/* On mobile: above input. On lg+: right */}
      <div className="flex-1 min-h-[400px] p-4 lg:p-6 flex flex-col">
        <div className="flex-1 min-h-[400px]">
          <SpiderGraph
            key={`${entries.length}-${entries[entries.length - 1]?.id ?? "init"}`}
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
