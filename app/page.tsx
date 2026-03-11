import { fetchLifeUpdates } from "@/app/actions/life-updates";
import { DashboardClient } from "@/app/components/DashboardClient";
import { LockButton } from "@/app/components/LockButton";

export default async function Home() {
  const entries = await fetchLifeUpdates();

  return (
    <main className="min-h-screen bg-[#0a0a0f] text-cyan-100 overflow-hidden">
      <header className="relative z-10 px-4 py-3 border-b border-cyan-500/20 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-cyan-400 tracking-widest font-mono">
            JRNL
          </h1>
          <p className="text-cyan-500/60 text-xs mt-0.5 font-mono">
            Arasaka Agent Assessment to Baseline
          </p>
        </div>
        <LockButton />
      </header>
      {/* Cyber grid background */}
      <div
        className="fixed inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `linear-gradient(rgba(0,255,136,0.3) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0,255,136,0.3) 1px, transparent 1px)`,
          backgroundSize: "40px 40px",
        }}
        aria-hidden
      />
      <div className="fixed inset-0 pointer-events-none" aria-hidden>
        <div
          className="absolute inset-0 opacity-[0.02]"
          style={{
            background: "radial-gradient(ellipse at center, #00ff88 0%, transparent 70%)",
          }}
        />
      </div>

      <DashboardClient initialEntries={entries} />
    </main>
  );
}
