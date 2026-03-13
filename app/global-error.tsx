"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body style={{ margin: 0, padding: "2rem", fontFamily: "monospace", background: "#0a0a0f", color: "#22d3ee", minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        <h2 style={{ marginBottom: "1rem" }}>Something went wrong</h2>
        <p style={{ opacity: 0.8, marginBottom: "1.5rem", textAlign: "center" }}>
          The app encountered an error. Please try again.
        </p>
        <button
          onClick={reset}
          style={{ padding: "0.5rem 1rem", background: "rgba(34, 211, 238, 0.3)", border: "1px solid rgba(34, 211, 238, 0.5)", color: "#22d3ee", cursor: "pointer", fontWeight: "bold", textTransform: "uppercase" }}
        >
          Try again
        </button>
      </body>
    </html>
  );
}
