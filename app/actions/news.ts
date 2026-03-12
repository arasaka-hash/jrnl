"use server";

import { unstable_noStore } from "next/cache";
import { GoogleGenAI } from "@google/genai";
import type { TrackingPointId } from "@/lib/types";
import { TRACKING_POINTS } from "@/lib/types";

export interface NewsHeadline {
  category: "technology" | "finance";
  text: string;
  url?: string;
  description?: string;
}

/** Rich headline returned to client with url and summary for accordion */
export interface NewsHeadlineItem {
  title: string;
  url?: string;
  description?: string;
}

export interface NewsResult {
  headlines: NewsHeadlineItem[];
  zDeltas: Record<TrackingPointId, number>;
}

const BRAVE_NEWS_URL = "https://api.search.brave.com/res/v1/news/search";

const QUERIES: { category: NewsHeadline["category"]; q: string }[] = [
  { category: "technology", q: "technology crisis breaking news" },
  { category: "technology", q: "tech crash AI cyberattack" },
  { category: "technology", q: "tech layoffs stock plunge" },
  { category: "finance", q: "stock market crash recession" },
  { category: "finance", q: "fed inflation markets crisis" },
  { category: "finance", q: "finance breaking economy" },
];

/** Category → tracking points that get positive Z when that category has more headlines */
const CATEGORY_TO_POINTS: Record<NewsHeadline["category"], TrackingPointId[]> = {
  technology: ["Technical Ability", "Intelligence"],
  finance: ["Cool", "Intelligence"],
};

const TARGET_HEADLINE_COUNT = 10;
const MODELS_TO_TRY = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-1.5-flash"];

export async function fetchNewsHeadlines(): Promise<NewsResult> {
  unstable_noStore();
  const braveKey =
    process.env.BRAVE_SEARCH_API_KEY ?? process.env.BRAVE_API_KEY;
  const geminiKey =
    process.env.GOOGLE_GENERATIVE_AI_API_KEY ?? process.env.GEMINI_API_KEY;

  const emptyResult: NewsResult = {
    headlines: [],
    zDeltas: Object.fromEntries(
      TRACKING_POINTS.map((id) => [id, 0])
    ) as Record<TrackingPointId, number>,
  };

  if (!braveKey) return emptyResult;

  const headlines: NewsHeadline[] = [];
  const categoryCounts: Record<NewsHeadline["category"], number> = {
    technology: 0,
    finance: 0,
  };

  try {
    for (const { category, q } of QUERIES) {
      const url = new URL(BRAVE_NEWS_URL);
      url.searchParams.set("q", q);
      url.searchParams.set("count", "15");
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
      type RawItem = { title?: string; description?: string; url?: string; link?: string };
      const rawResults: RawItem[] =
        (data.results as RawItem[]) ??
        ((data.news as Record<string, unknown>)?.results as RawItem[]) ??
        (data.news_results as RawItem[]) ??
        [];

      for (const r of rawResults) {
        const text = (r.title || r.description || "").trim();
        if (text && text.length > 15) {
          const url = (typeof r.url === "string" ? r.url : typeof r.link === "string" ? r.link : undefined);
          headlines.push({
            category,
            text: text.slice(0, 150),
            url,
            description: typeof r.description === "string" ? r.description.trim().slice(0, 400) : undefined,
          });
          categoryCounts[category]++;
        }
      }
    }

    const zDeltas = computeZDeltas(categoryCounts);

    let selectedTexts: string[];
    if (geminiKey && headlines.length > 0) {
      selectedTexts = await selectAlarmistHeadlines(headlines, geminiKey);
    } else {
      selectedTexts = headlines
        .slice(0, TARGET_HEADLINE_COUNT)
        .map((h) => h.text);
    }

    const seen = new Set<string>();
    const dedupedTexts = selectedTexts.filter((t) => {
      const key = t.toLowerCase().slice(0, 80);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    // Map selected texts back to full headline objects (match by title/text)
    const findHeadline = (selectedText: string): NewsHeadline | undefined => {
      const s = selectedText.toLowerCase();
      const exact = headlines.find((h) => h.text.toLowerCase() === s);
      if (exact) return exact;
      const startsWith = headlines.find((h) =>
        h.text.toLowerCase().startsWith(s.slice(0, 50)) || s.startsWith(h.text.toLowerCase().slice(0, 50))
      );
      if (startsWith) return startsWith;
      return headlines.find((h) =>
        h.text.toLowerCase().includes(s.slice(0, 40)) || s.includes(h.text.toLowerCase().slice(0, 40))
      );
    };

    const richHeadlines: NewsHeadlineItem[] = dedupedTexts
      .slice(0, TARGET_HEADLINE_COUNT)
      .map((t) => {
        const h = findHeadline(t);
        return {
          title: t,
          url: h?.url,
          description: h?.description,
        };
      });

    return {
      headlines: richHeadlines,
      zDeltas,
    };
  } catch (e) {
    console.error("News fetch error:", e);
    return emptyResult;
  }
}

async function selectAlarmistHeadlines(
  headlines: NewsHeadline[],
  apiKey: string
): Promise<string[]> {
  const ai = new GoogleGenAI({ apiKey });
  const list = headlines.map((h) => `[${h.category}] ${h.text}`).join("\n");

  const prompt = `You are selecting ALARMIST and MAJOR headlines from tech and finance only. Given these headlines:

"""
${list}
"""

Select exactly 10 headlines that are the most alarmist, major, or consequential. Prefer: market crashes, crises, breaking news, major announcements, scandals, layoffs, cyberattacks, fed decisions, recession signals. Skip minor/neutral stories.

Return ONLY a JSON array of 10 headline strings, no other text. Example: ["Headline 1", "Headline 2", ...]
Use the exact headline text from the list. If fewer than 10 qualify, pad with the most significant remaining ones.`;

  for (const model of MODELS_TO_TRY) {
    try {
      const res = await ai.models.generateContent({
        model,
        contents: prompt,
        config: { responseMimeType: "application/json" },
      });

      const raw = res as { text?: string; candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
      let text = raw.text?.trim();
      if (!text && raw.candidates?.[0]?.content?.parts?.[0]?.text) {
        text = raw.candidates[0].content.parts[0].text.trim();
      }
      if (!text) continue;

      text = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
      const match = text.match(/\[[\s\S]*\]/);
      if (match) text = match[0];

      const arr = JSON.parse(text) as string[];
      if (Array.isArray(arr) && arr.length > 0) {
        return arr.slice(0, TARGET_HEADLINE_COUNT).filter((s) => typeof s === "string" && s.trim());
      }
    } catch {
      continue;
    }
  }

  return headlines.slice(0, TARGET_HEADLINE_COUNT).map((h) => h.text);
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
