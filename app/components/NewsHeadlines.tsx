"use client";

import { useState, useEffect, useRef } from "react";
import { fetchNewsHeadlines } from "@/app/actions/news";
import type { NewsHeadlineItem } from "@/app/actions/news";
import { useDivergence } from "@/app/context/DivergenceContext";

const INTERVAL_MIN_MS = 30_000;
const INTERVAL_MAX_MS = 90_000;
const HOLD_MIN_MS = 8_000;
const HOLD_MAX_MS = 12_000;
const FADE_DURATION_MS = 600;

function randomBetween(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

function shuffle<T>(arr: T[]): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export function NewsHeadlines({
  onHeadlinesLoaded,
}: {
  onHeadlinesLoaded?: (headlines: NewsHeadlineItem[], zDeltas: Record<string, number>) => void;
}) {
  const { mode } = useDivergence();
  const [headlines, setHeadlines] = useState<NewsHeadlineItem[]>([]);
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  const [displayHeadline, setDisplayHeadline] = useState("");
  const [visible, setVisible] = useState(false);
  const [fadeOut, setFadeOut] = useState(false);
  const indexRef = useRef(0);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;

    async function loadHeadlines() {
      try {
        const { headlines: fetched, zDeltas } = await fetchNewsHeadlines();
        if (!mountedRef.current) return;
        if (fetched.length > 0) {
          setHeadlines(shuffle(fetched));
          setExpandedIndex(null);
          indexRef.current = 0;
          onHeadlinesLoaded?.(fetched, zDeltas);
        }
      } catch (e) {
        console.error("NewsHeadlines load error:", e);
      }
    }

    loadHeadlines();

    return () => {
      mountedRef.current = false;
    };
  }, [onHeadlinesLoaded]);

  useEffect(() => {
    if (mode !== "singular" || headlines.length === 0) return;

    function showNext() {
      const idx = indexRef.current % headlines.length;
      const h = headlines[idx];
      if (!h) {
        scheduleNext();
        return;
      }

      setDisplayHeadline(h.title);
      setVisible(true);
      setFadeOut(false);

      const holdMs = randomBetween(HOLD_MIN_MS, HOLD_MAX_MS);
      timeoutRef.current = setTimeout(() => {
        if (!mountedRef.current) return;
        setFadeOut(true);
        timeoutRef.current = setTimeout(() => {
          if (!mountedRef.current) return;
          setVisible(false);
          indexRef.current += 1;
          const delayMs = randomBetween(INTERVAL_MIN_MS, INTERVAL_MAX_MS);
          timeoutRef.current = setTimeout(scheduleNext, delayMs);
        }, FADE_DURATION_MS);
      }, holdMs);
    }

    function scheduleNext() {
      if (!mountedRef.current) return;
      showNext();
    }

    const initialDelayMs = randomBetween(INTERVAL_MIN_MS / 2, INTERVAL_MAX_MS / 2);
    timeoutRef.current = setTimeout(scheduleNext, initialDelayMs);

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [mode, headlines]);

  const toggleExpand = (index: number) => {
    setExpandedIndex((prev) => (prev === index ? null : index));
  };

  const hasExpandable = (h: NewsHeadlineItem) => h.description || h.url;

  const isVisible =
    mode === "aggregate"
      ? headlines.length > 0
      : visible && !!displayHeadline;

  return (
    <div
      className={`news-headlines-modal ${isVisible ? "news-headlines-visible" : ""}`}
      aria-live="polite"
    >
      <div
        className={`news-headlines-inner ${mode === "aggregate" ? "news-headlines-pointer-events" : ""} ${mode === "singular" && fadeOut ? "news-headlines-fade-out" : ""}`}
        style={mode === "singular" ? { transition: `opacity ${FADE_DURATION_MS}ms ease` } : undefined}
      >
        <div className="news-headlines-prefix">DIVERGENCE</div>

        {mode === "aggregate" ? (
          <div className="news-headlines-list">
            {headlines.map((h, i) => (
              <div key={i} className="news-headlines-accordion-item">
                <button
                  type="button"
                  className="news-headlines-accordion-trigger"
                  onClick={() => toggleExpand(i)}
                  aria-expanded={expandedIndex === i}
                  aria-controls={`news-headline-panel-${i}`}
                  id={`news-headline-trigger-${i}`}
                >
                  <span className="news-headlines-text">{h.title}</span>
                  {hasExpandable(h) && (
                    <span className="news-headlines-chevron" aria-hidden>
                      {expandedIndex === i ? "▾" : "▸"}
                    </span>
                  )}
                </button>
                {expandedIndex === i && hasExpandable(h) && (
                  <div
                    id={`news-headline-panel-${i}`}
                    className="news-headlines-accordion-panel"
                    role="region"
                    aria-labelledby={`news-headline-trigger-${i}`}
                  >
                    {h.description && (
                      <p className="news-headlines-summary">{h.description}</p>
                    )}
                    {h.url && (
                      <a
                        href={h.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="news-headlines-source-link"
                      >
                        Open source ↗
                      </a>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="news-headlines-row">
            <span className="news-headlines-text">{displayHeadline || "—"}</span>
          </div>
        )}
      </div>
    </div>
  );
}
