"use client";

import { useState } from "react";
import type { PointStats, TrackingPointId } from "@/lib/types";
import { POINT_COLORS } from "@/lib/types";

function getPointLabel(id: TrackingPointId): string {
  if (id === "Love and Awareness") return "LOVE";
  if (id === "Physical Presence") return "PHYSICAL";
  if (id === "Technical Ability") return "TECHNICAL";
  return id.toUpperCase();
}

export interface TerminalNodeProps {
  pointId: TrackingPointId;
  stats: PointStats | null;
  onClose: () => void;
}

export function TerminalNode({ pointId, stats, onClose }: TerminalNodeProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const heroStat = stats?.heroStat ?? 50;
  const trendline = stats?.trendline ?? [];
  const entries = stats?.entries ?? [];
  const color = POINT_COLORS[pointId];
  const label = getPointLabel(pointId);

  const trendlineSvg = trendline.length >= 2
    ? trendline
        .map((v, i) => {
          const x = (i / (trendline.length - 1)) * 100;
          const y = 100 - (v / 100) * 80 - 10;
          return `${i === 0 ? "M" : "L"} ${x} ${y}`;
        })
        .join(" ")
    : "";

  return (
    <div className="w-full max-w-md mx-4 flex items-center justify-center">
      <div
        className="w-full max-w-md bg-black/95 rounded-lg overflow-hidden font-mono"
        style={{
          fontFamily: "var(--font-mono), monospace",
          borderColor: color,
          borderWidth: 1,
          boxShadow: `0 0 30px ${color}40`,
        }}
      >
        {/* Terminal header */}
        <div
          className="flex items-center justify-between px-4 py-2 border-b"
          style={{ borderColor: `${color}60`, backgroundColor: `${color}15` }}
        >
          <span
            className="text-sm font-semibold tracking-wider"
            style={{ color }}
          >
            {label}
          </span>
          <button
            onClick={onClose}
            className="text-lg leading-none opacity-80 hover:opacity-100"
            style={{ color }}
            aria-label="Close"
          >
            ×
          </button>
        </div>

        {/* Hero stat */}
        <div className="px-4 py-4 border-b" style={{ borderColor: `${color}30` }}>
          <div className="text-xs uppercase tracking-widest mb-1 opacity-70" style={{ color }}>
            Hero Stat
          </div>
          <div className="text-4xl font-bold tabular-nums" style={{ color }}>
            {heroStat}
          </div>
        </div>

        {/* Trendline */}
        {trendline.length >= 2 && (
          <div className="px-4 py-3 border-b" style={{ borderColor: `${color}30` }}>
            <div className="text-xs uppercase tracking-widest mb-2 opacity-70" style={{ color }}>
              Trendline
            </div>
            <svg
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
              className="w-full h-12"
            >
              <path
                d={trendlineSvg}
                fill="none"
                stroke={color}
                strokeWidth="1"
                opacity={0.7}
              />
            </svg>
          </div>
        )}

        {/* Entries - clickable dates/headlines */}
        <div className="px-4 py-3 max-h-48 overflow-y-auto">
          <div className="text-xs uppercase tracking-widest mb-2 opacity-70" style={{ color }}>
            Details
          </div>
          <div className="space-y-2">
            {entries.length === 0 ? (
              <div className="text-sm opacity-50" style={{ color }}>No entries yet</div>
            ) : (
              entries.map((e) => (
                <div key={e.id} className="border-l-2 pl-2" style={{ borderColor: `${color}50` }}>
                  <button
                    onClick={() =>
                      setExpandedId(expandedId === e.id ? null : e.id)
                    }
                    className="text-left w-full text-sm hover:opacity-100 opacity-90"
                    style={{ color }}
                  >
                    <span className="text-xs opacity-70">{e.date}</span> —{" "}
                    {e.headline}
                  </button>
                  {expandedId === e.id && (
                    <div className="mt-2 text-sm leading-relaxed opacity-90" style={{ color }}>
                      {e.narrative}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
