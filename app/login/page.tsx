"use client";

import { useState } from "react";

export default function LoginPage() {
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin }),
      });
      const data = await res.json();
      if (data.ok) {
        window.location.href = "/";
      } else {
        setError(data.error ?? "Invalid PIN");
        setPin("");
      }
    } catch {
      setError("Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#0a0a0f] text-cyan-100 flex flex-col items-center justify-center p-6">
      <div
        className="fixed inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `linear-gradient(rgba(0,255,136,0.3) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0,255,136,0.3) 1px, transparent 1px)`,
          backgroundSize: "40px 40px",
        }}
        aria-hidden
      />
      <div className="relative z-10 w-full max-w-sm">
        <div className="border border-cyan-500/30 rounded-lg p-8 bg-black/50 shadow-[0_0_30px_rgba(0,255,136,0.08)]">
          <h1 className="text-2xl font-bold text-cyan-400 tracking-widest text-center mb-2">
            JRNL
          </h1>
          <p className="text-cyan-500/60 text-xs text-center mb-8 font-mono">
            Arasaka Agent Assessment to Baseline
          </p>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="pin"
                className="block text-cyan-500/80 text-xs uppercase tracking-wider mb-2"
              >
                Enter PIN
              </label>
              <input
                id="pin"
                type="password"
                inputMode="numeric"
                pattern="[0-9]*"
                autoComplete="off"
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
                maxLength={8}
                placeholder="••••"
                className="w-full px-4 py-3 bg-black/50 border border-cyan-500/40 rounded text-cyan-100 text-center text-xl tracking-[0.5em] font-mono focus:outline-none focus:ring-1 focus:ring-cyan-500/50 focus:border-cyan-500/50 placeholder:cyan-500/30"
                disabled={loading}
                autoFocus
              />
            </div>
            {error && (
              <p className="text-red-400 text-sm text-center">{error}</p>
            )}
            <button
              type="submit"
              disabled={loading || pin.length === 0}
              className="w-full py-2.5 px-4 bg-cyan-600/90 hover:bg-cyan-500 disabled:bg-cyan-900/30 disabled:cursor-not-allowed text-black font-bold tracking-widest uppercase border border-cyan-400/50 transition-all font-mono"
            >
              {loading ? "VERIFYING..." : "UNLOCK"}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
