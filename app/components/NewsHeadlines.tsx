"use client";

import { useState, useEffect, useRef } from "react";
import { fetchNewsHeadlines } from "@/app/actions/news";

const INTERVALS_MS = [36000, 77000, 120000];
const HOLD_MIN = 10000;
const HOLD_MAX = 12000;
const FADE_DURATION = 600;

function pickInterval(): number {
  return INTERVALS_MS[Math.floor(Math.random() * INTERVALS_MS.length)];
}

export function NewsHeadlines({
  onHeadlinesLoaded,
}: {
  onHeadlinesLoaded?: (insights: string[], zDeltas: Record<string, number>) => void;
}) {
  const [insight, setInsight] = useState("");
  const [visible, setVisible] = useState(false);
  const [fadeOut, setFadeOut] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;

    function scheduleNext() {
      const intervalMs = pickInterval();
      timeoutRef.current = setTimeout(() => load(), intervalMs);
    }

    async function load() {
      try {
        const { insights, zDeltas } = await fetchNewsHeadlines();
        if (!mountedRef.current) return;
        if (insights.length > 0) {
          setInsight(insights[0]);
          setVisible(true);
          setFadeOut(false);
          onHeadlinesLoaded?.(insights, zDeltas);

          const holdMs = HOLD_MIN + Math.random() * (HOLD_MAX - HOLD_MIN);
          timeoutRef.current = setTimeout(() => {
            if (!mountedRef.current) return;
            setFadeOut(true);
            timeoutRef.current = setTimeout(() => {
              if (!mountedRef.current) return;
              setVisible(false);
              scheduleNext();
            }, FADE_DURATION);
          }, holdMs);
        } else {
          scheduleNext();
        }
      } catch (e) {
        console.error("NewsHeadlines load error:", e);
        scheduleNext();
      }
    }

    load();

    return () => {
      mountedRef.current = false;
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [onHeadlinesLoaded]);

  return (
    <div
      className={`news-headlines-modal ${visible && insight ? "news-headlines-visible" : ""}`}
      aria-live="polite"
    >
      <div
        className={`news-headlines-inner ${fadeOut ? "news-headlines-fade-out" : ""}`}
        style={{ transition: `opacity ${FADE_DURATION}ms ease` }}
      >
        <div className="news-headlines-prefix">&gt; DIVERGENCE</div>
        <div className="news-headlines-row">
          <span className="news-headlines-text">{insight || "—"}</span>
        </div>
      </div>
    </div>
  );
}
