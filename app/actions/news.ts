"use server";

import { unstable_noStore } from "next/cache";
import { GoogleGenAI } from "@google/genai";
import type { TrackingPointId } from "@/lib/types";
import { TRACKING_POINTS } from "@/lib/types";

export interface NewsHeadline {
  category: "science" | "technology" | "finance";
  text: string;
}

export interface NewsResult {
  insights: string[];
  zDeltas: Record<TrackingPointId, number>;
}

const BRAVE_NEWS_URL = "https://api.search.brave.com/res/v1/news/search";

const QUERIES: { category: NewsHeadline["category"]; q: string }[] = [
  { category: "science", q: "science research discovery" },
  { category: "technology", q: "technology AI software" },
  { category: "finance", q: "finance economy markets" },
];

/** Category → tracking points that get positive Z when that category has more headlines */
const CATEGORY_TO_POINTS: Record<NewsHeadline["category"], TrackingPointId[]> = {
  science: ["Gratitude and Awareness", "Mindfulness", "Physical Presence"],
  technology: ["Technical Ability", "Intelligence"],
  finance: ["Cool", "Intelligence"],
};

export async function fetchNewsHeadlines(): Promise<NewsResult> {
  unstable_noStore();
  const braveKey =
    process.env.BRAVE_SEARCH_API_KEY ?? process.env.BRAVE_API_KEY;
  const geminiKey =
    process.env.GOOGLE_GENERATIVE_AI_API_KEY ?? process.env.GEMINI_API_KEY;

  const emptyResult = {
    insights: [] as string[],
    zDeltas: Object.fromEntries(
      TRACKING_POINTS.map((id) => [id, 0])
    ) as Record<TrackingPointId, number>,
  };

  if (!braveKey) {
    if (geminiKey) {
      const fallback = await generateFallbackInsight();
      if (fallback) return { ...emptyResult, insights: [fallback] };
    }
    return emptyResult;
  }

  const headlines: NewsHeadline[] = [];
  const categoryCounts: Record<NewsHeadline["category"], number> = {
    science: 0,
    technology: 0,
    finance: 0,
  };

  try {
    for (const { category, q } of QUERIES) {
      const url = new URL(BRAVE_NEWS_URL);
      url.searchParams.set("q", q);
      url.searchParams.set("count", "5");
      url.searchParams.set("freshness", "pd");

      const res = await fetch(url.toString(), {
        headers: {
          "X-Subscription-Token": braveKey,
          Accept: "application/json",
        },
        cache: "no-store",
      });

      if (!res.ok) {
        console.error(`Brave News API error (${category}):`, res.status, await res.text());
        continue;
      }

      const data = (await res.json()) as Record<string, unknown>;
      const newsObj = data.news as Record<string, unknown> | undefined;
      const rawResults: Array<{ title?: string; description?: string }> =
        (data.results as Array<{ title?: string; description?: string }>) ??
        (newsObj?.results as Array<{ title?: string; description?: string }>) ??
        (data.news as Array<{ title?: string; description?: string }>) ??
        (data.news_results as Array<{ title?: string; description?: string }>) ??
        [];

      for (const r of rawResults.slice(0, 3)) {
        const text = (r.title || r.description || "").trim();
        if (text) {
          headlines.push({
            category,
            text: text.slice(0, 120),
          });
          categoryCounts[category]++;
        }
      }
    }

    const zDeltas = computeZDeltas(categoryCounts);
    let insights = await synthesizeInsights(headlines);
    if (insights.length === 0 && geminiKey) {
      const fallback = await generateFallbackInsight();
      if (fallback) insights = [fallback];
    }
    return { insights, zDeltas };
  } catch (e) {
    console.error("News fetch error:", e);
    if (geminiKey) {
      const fallback = await generateFallbackInsight();
      if (fallback) {
        return {
          insights: [fallback],
          zDeltas: Object.fromEntries(
            TRACKING_POINTS.map((id) => [id, 0])
          ) as Record<TrackingPointId, number>,
        };
      }
    }
    return {
      insights: [],
      zDeltas: Object.fromEntries(
        TRACKING_POINTS.map((id) => [id, 0])
      ) as Record<TrackingPointId, number>,
    };
  }
}

async function synthesizeInsights(headlines: NewsHeadline[]): Promise<string[]> {
  const apiKey =
    process.env.GOOGLE_GENERATIVE_AI_API_KEY ?? process.env.GEMINI_API_KEY;
  if (!apiKey || headlines.length === 0) return [];

  const ai = new GoogleGenAI({ apiKey });
  const headlineText = headlines.map((h) => `[${h.category}] ${h.text}`).join("\n");

  const prompt = `You are synthesizing today's news into a single narrative insight. Given these headlines from science, technology, and finance:

"""
${headlineText}
"""

Write ONE short insight (1-2 sentences, max 180 chars) that weaves these into a coherent story—a moment in time, a theme, or a thread connecting them. Be evocative and specific. No quotes or attribution. Output only the insight text.`;

  try {
    const res = await ai.models.generateContent({
      model: "gemini-2.0-flash-exp",
      contents: prompt,
    });
    const raw = res as { text?: string; candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
    let text = raw.text?.trim();
    if (!text && raw.candidates?.[0]?.content?.parts?.[0]?.text) {
      text = raw.candidates[0].content.parts[0].text.trim();
    }
    if (text) return [text.slice(0, 200)];
  } catch (e) {
    console.error("Gemini synthesis error:", e);
  }
  return headlines.slice(0, 1).map((h) => h.text);
}

async function generateFallbackInsight(): Promise<string | null> {
  const apiKey =
    process.env.GOOGLE_GENERATIVE_AI_API_KEY ?? process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  try {
    const ai = new GoogleGenAI({ apiKey });
    const res = await ai.models.generateContent({
      model: "gemini-2.0-flash-exp",
      contents:
        "Write ONE short evocative sentence (max 120 chars) about today—a theme, mood, or moment. No quotes. Output only the sentence.",
    });
    const raw = res as { text?: string; candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
    let text = raw.text?.trim();
    if (!text && raw.candidates?.[0]?.content?.parts?.[0]?.text) {
      text = raw.candidates[0].content.parts[0].text.trim();
    }
    return text ? text.slice(0, 200) : null;
  } catch {
    return null;
  }
}

function computeZDeltas(
  counts: Record<NewsHeadline["category"], number>
): Record<TrackingPointId, number> {
  const deltas = Object.fromEntries(
    TRACKING_POINTS.map((id) => [id, 0])
  ) as Record<TrackingPointId, number>;

  const maxCount = Math.max(...Object.values(counts), 1);
  const scale = 0.08 / maxCount;

  for (const [category, count] of Object.entries(counts)) {
    const points = CATEGORY_TO_POINTS[category as NewsHeadline["category"]];
    const delta = count * scale;
    for (const id of points) {
      deltas[id] = Math.min(0.08, (deltas[id] ?? 0) + delta);
    }
  }

  return deltas;
}
