"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import type { TrackingPointId } from "@/lib/types";
import { TRACKING_POINTS } from "@/lib/types";

const BranchContext = createContext<{
  branchZDeltas: Partial<Record<TrackingPointId, number>> | null;
  setBranchZDeltas: (deltas: Partial<Record<TrackingPointId, number>> | null) => void;
  branch: () => Partial<Record<TrackingPointId, number>>;
} | null>(null);

/** Map random 1-100 to Z delta range ~-0.4 to 0.4 */
function randomToZDelta(): number {
  const r = Math.floor(Math.random() * 100) + 1;
  return (r - 50) / 125;
}

export function BranchProvider({ children }: { children: ReactNode }) {
  const [branchZDeltas, setBranchZDeltasState] = useState<Partial<Record<TrackingPointId, number>> | null>(null);

  const setBranchZDeltas = useCallback((deltas: Partial<Record<TrackingPointId, number>> | null) => {
    setBranchZDeltasState(deltas);
  }, []);

  const branch = useCallback(() => {
    const deltas: Partial<Record<TrackingPointId, number>> = {};
    for (const id of TRACKING_POINTS) {
      deltas[id] = randomToZDelta();
    }
    setBranchZDeltasState(deltas);
    return deltas;
  }, []);

  return (
    <BranchContext.Provider value={{ branchZDeltas, setBranchZDeltas, branch }}>
      {children}
    </BranchContext.Provider>
  );
}

export function useBranch() {
  const ctx = useContext(BranchContext);
  if (!ctx) throw new Error("useBranch must be used within BranchProvider");
  return ctx;
}
