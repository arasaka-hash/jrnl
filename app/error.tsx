"use client";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-screen bg-[#0a0a0f] flex flex-col items-center justify-center p-6 text-cyan-100 font-mono">
      <h2 className="text-xl text-cyan-400 mb-4">Something went wrong</h2>
      <p className="text-cyan-500/80 text-sm mb-6 text-center max-w-md">
        The app encountered an error. This may be due to a temporary connection issue.
      </p>
      <button
        onClick={reset}
        className="px-4 py-2 bg-cyan-600/90 hover:bg-cyan-500 text-black font-bold uppercase tracking-wider border border-cyan-400/50 rounded transition-colors"
      >
        Try again
      </button>
    </div>
  );
}
