"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { rollbackLatest, rebuildAll, branchHostConstruct } from "@/app/actions/life-updates";
import { useDivergence } from "@/app/context/DivergenceContext";
import { useBranch } from "@/app/context/BranchContext";

export function AdminMenu() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const { mode: divergenceMode, setMode: setDivergenceMode } = useDivergence();
  const { branch } = useBranch();

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("click", handleClickOutside);
      return () => document.removeEventListener("click", handleClickOutside);
    }
  }, [open]);

  async function handleEncryptTerminal() {
    setOpen(false);
    await fetch("/api/auth", { method: "DELETE" });
    window.location.href = "/login";
  }

  async function handleRollback() {
    setLoading("rollback");
    try {
      const res = await rollbackLatest();
      if (res.ok) {
        setOpen(false);
        router.refresh();
      }
    } finally {
      setLoading(null);
    }
  }

  async function handleBranch() {
    setLoading("branch");
    try {
      branch(); // set random Z deltas
      const res = await branchHostConstruct();
      if (res.ok) {
        setOpen(false);
        router.refresh();
      }
    } finally {
      setLoading(null);
    }
  }

  async function handleRebuild() {
    if (!confirm("REBUILD HOST CONSTRUCT will wipe all entries. Continue?")) return;
    setLoading("rebuild");
    try {
      const res = await rebuildAll();
      if (res.ok) {
        setOpen(false);
        router.refresh();
      }
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="p-2 text-cyan-500/70 hover:text-cyan-400 hover:bg-cyan-500/10 rounded transition-colors"
        aria-label="Admin menu"
        aria-expanded={open}
      >
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 6h16M4 12h16M4 18h16"
          />
        </svg>
      </button>

      {open && (
        <div
          className="absolute right-0 top-full mt-1 py-2 min-w-[220px] bg-black/95 border border-cyan-500/30 rounded shadow-[0_0_20px_rgba(0,255,136,0.1)] font-mono text-xs uppercase tracking-wider z-[9999]"
          role="menu"
        >
          <button
            type="button"
            onClick={handleEncryptTerminal}
            className="w-full px-4 py-2.5 text-left text-cyan-400 hover:bg-cyan-500/10 hover:text-cyan-300 transition-colors"
            role="menuitem"
          >
            ENCRYPT TERMINAL
          </button>
          <button
            type="button"
            onClick={handleRollback}
            disabled={!!loading}
            className="w-full px-4 py-2.5 text-left text-cyan-400 hover:bg-cyan-500/10 hover:text-cyan-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            role="menuitem"
          >
            {loading === "rollback" ? "..." : "ROLLBACK HOST CONSTRUCT"}
          </button>
          <button
            type="button"
            onClick={handleBranch}
            disabled={!!loading}
            className="w-full px-4 py-2.5 text-left text-cyan-400 hover:bg-cyan-500/10 hover:text-cyan-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            role="menuitem"
          >
            {loading === "branch" ? "BRANCHING" : "BRANCH HOST CONSTRUCT"}
          </button>
          <button
            type="button"
            onClick={handleRebuild}
            disabled={!!loading}
            className="w-full px-4 py-2.5 text-left text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed border-t border-cyan-500/20 mt-1 pt-2"
            role="menuitem"
          >
            {loading === "rebuild" ? "..." : "REBUILD HOST CONSTRUCT"}
          </button>

          <div className="border-t border-cyan-500/20 mt-1 pt-2 px-4 pb-1">
            <div className="text-cyan-500/60 text-[0.65rem] mb-1.5">DIVERGENCE</div>
            <div className="flex gap-2">
              {(["aggregate", "singular"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setDivergenceMode(m)}
                  className={`px-2.5 py-1 text-[0.65rem] rounded transition-colors ${
                    divergenceMode === m
                      ? "bg-cyan-500/30 text-cyan-300"
                      : "text-cyan-400/80 hover:bg-cyan-500/10 hover:text-cyan-300"
                  }`}
                  role="menuitem"
                >
                  {m}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
