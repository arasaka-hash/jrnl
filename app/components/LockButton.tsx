"use client";

export function LockButton() {
  async function handleLock() {
    await fetch("/api/auth", { method: "DELETE" });
    window.location.href = "/login";
  }

  return (
    <button
      type="button"
      onClick={handleLock}
      className="text-cyan-500/60 hover:text-cyan-400 text-xs font-mono uppercase tracking-wider transition-colors"
    >
      Lock
    </button>
  );
}
