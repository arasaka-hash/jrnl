"use client";

import type { ParsedLifeUpdate } from "@/app/actions/life-updates";
import { POINT_COLORS } from "@/lib/types";
import type { TrackingPointId } from "@/lib/types";

function getPointLabel(id: TrackingPointId): string {
  if (id === "Love and Awareness") return "Love";
  if (id === "Physical Presence") return "Physical";
  if (id === "Technical Ability") return "Technical";
  return id;
}

export interface ConfirmUploadModalProps {
  parsed: ParsedLifeUpdate;
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
}

export function ConfirmUploadModal({
  parsed,
  onConfirm,
  onCancel,
  loading = false,
}: ConfirmUploadModalProps) {
  return (
    <div
      className="fixed inset-0 bg-black/40 z-20 flex items-center justify-center p-4"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-lg bg-black/95 rounded-lg overflow-hidden font-mono border border-cyan-500/40 shadow-[0_0_40px_rgba(0,255,136,0.15)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Point scores along top - small type */}
        <div className="px-4 pt-3 pb-2 border-b border-cyan-500/30">
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-[0.65rem] tracking-wider uppercase">
            {parsed.scores.map((s) => (
              <span
                key={s.pointId}
                className="opacity-90"
                style={{ color: POINT_COLORS[s.pointId as TrackingPointId] }}
              >
                {getPointLabel(s.pointId as TrackingPointId)}: {s.score}
              </span>
            ))}
          </div>
        </div>

        {/* Parsed entry */}
        <div className="p-4 space-y-3">
          <div>
            <p className="text-cyan-400/80 text-xs uppercase tracking-wider mb-1">
              Headline
            </p>
            <p className="text-cyan-100 text-sm">{parsed.headline}</p>
          </div>
          <div>
            <p className="text-cyan-400/80 text-xs uppercase tracking-wider mb-1">
              Narrative
            </p>
            <p className="text-cyan-200/90 text-sm leading-relaxed max-h-24 overflow-y-auto">
              {parsed.narrative}
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="p-4 pt-0 flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="flex-1 py-2 px-4 font-mono text-xs tracking-wider uppercase border border-cyan-500/40 bg-black/50 text-cyan-400 hover:border-cyan-500/60 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 py-2 px-4 bg-cyan-600/90 hover:bg-cyan-500 disabled:bg-cyan-900/30 disabled:cursor-not-allowed text-black font-bold tracking-widest uppercase border border-cyan-400/50 hover:border-cyan-300 disabled:border-cyan-800/50 transition-all hover:shadow-[0_0_20px_rgba(0,255,136,0.3)] font-mono"
          >
            {loading ? "UPLOADING..." : "AUTHORIZE UPLOAD"}
          </button>
        </div>
      </div>
    </div>
  );
}
