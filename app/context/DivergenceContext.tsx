"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from "react";

export type DivergenceMode = "aggregate" | "singular";

const STORAGE_KEY = "jrnl-divergence-mode";

const DEFAULT_MODE: DivergenceMode = "singular";

function readStoredMode(): DivergenceMode {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v === "aggregate" || v === "singular") return v;
  } catch {
    /* ignore */
  }
  return DEFAULT_MODE;
}

const DivergenceContext = createContext<{
  mode: DivergenceMode;
  setMode: (m: DivergenceMode) => void;
} | null>(null);

export function DivergenceProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<DivergenceMode>(DEFAULT_MODE);

  useEffect(() => {
    setModeState(readStoredMode());
  }, []);

  const setMode = useCallback((m: DivergenceMode) => {
    setModeState(m);
    try {
      localStorage.setItem(STORAGE_KEY, m);
    } catch {
      /* ignore */
    }
  }, []);

  return (
    <DivergenceContext.Provider value={{ mode, setMode }}>
      {children}
    </DivergenceContext.Provider>
  );
}

export function useDivergence() {
  const ctx = useContext(DivergenceContext);
  if (!ctx) throw new Error("useDivergence must be used within DivergenceProvider");
  return ctx;
}
