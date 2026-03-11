"use server";

import { GoogleGenAI } from "@google/genai";
import {
  createLifeUpdate,
  listLifeUpdates,
} from "@/lib/firestore";
import type {
  LifeUpdateEntry,
  PointScore,
  TrackingPointId,
} from "@/lib/types";
import { TRACKING_POINTS } from "@/lib/types";

const TRACKING_POINTS_STR = TRACKING_POINTS.join(", ");

async function parseUpdateWithAI(rawInput: string): Promise<{
  headline: string;
  narrative: string;
  scores: PointScore[];
}> {
  const apiKey =
    process.env.GOOGLE_GENERATIVE_AI_API_KEY ?? process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return {
      headline: rawInput.slice(0, 60) || "Untitled",
      narrative: rawInput,
      scores: TRACKING_POINTS.map((id) => ({ pointId: id, score: 50 })),
    };
  }

  const ai = new GoogleGenAI({ apiKey });

  const prompt = `You parse qualitative life updates into a neural profile. Map the user's input to the correct tracking points.

## Tracking points (score 0–100 each)

- **Gratitude and Awareness**: Appreciation, emotional intelligence, self-awareness, noticing positives, thankfulness
- **Mindfulness**: Focus, presence, meditation, calm, mental clarity, being in the moment
- **Intelligence**: Problem-solving, learning, adaptability, reasoning, curiosity, knowledge
- **Cool**: Personal brand, influence, style, confidence, social presence, charisma
- **Technical Ability**: Coding, tools, AI, remote work, shipping features, technical execution
- **Physical Presence**: Health, energy, fitness, sleep, body, executive presence, vitality

## Rules

1. Only update points that are clearly relevant to the input. Use 50 for "no change" (neutral).
2. Score 0–100 reflects how much this update affects that dimension (higher = positive impact).
3. One update often touches 1–3 points; others stay at 50.
4. Be specific: "finished a workout" → Physical Presence 75–90, not all points.

## Examples

Input: "Meditated 20 min this morning, felt really clear"
→ Mindfulness 80–90 (primary), Gratitude and Awareness 60–70 (secondary clarity)

Input: "Shipped the auth feature, fixed 3 bugs"
→ Technical Ability 75–85 (primary)

Input: "Great workout, ran 5k, slept 8 hours"
→ Physical Presence 80–90 (primary), Mindfulness 55–65 (rest/recovery)

## User input

"""
${rawInput}
"""

Respond with valid JSON only, no markdown:
{
  "headline": "Short 3-8 word summary",
  "narrative": "2-4 sentence expansion of the update",
  "scores": [
    {"pointId": "Gratitude and Awareness", "score": 0-100, "rationale": "brief reason or null if 50"},
    {"pointId": "Mindfulness", "score": 0-100, "rationale": "brief reason or null if 50"},
    {"pointId": "Intelligence", "score": 0-100, "rationale": "brief reason or null if 50"},
    {"pointId": "Cool", "score": 0-100, "rationale": "brief reason or null if 50"},
    {"pointId": "Technical Ability", "score": 0-100, "rationale": "brief reason or null if 50"},
    {"pointId": "Physical Presence", "score": 0-100, "rationale": "brief reason or null if 50"}
  ]
}

Every pointId must exactly match one of: ${TRACKING_POINTS_STR}`;

  try {
    const res = await ai.models.generateContent({
      model: "gemini-2.0-flash-exp",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      },
    });

    const text = (res as { text?: string }).text?.trim() ?? "{}";
    const parsed = JSON.parse(text) as {
      headline: string;
      narrative: string;
      scores: Array<{
        pointId: string;
        score: number;
        rationale?: string;
      }>;
    };

    const scores: PointScore[] = TRACKING_POINTS.map((id) => {
      const found = parsed.scores?.find(
        (s) => s.pointId === id || s.pointId?.replace(/\s+/g, " ") === id
      );
      return {
        pointId: id as TrackingPointId,
        score: Math.min(100, Math.max(0, found?.score ?? 50)),
        rationale: found?.rationale,
      };
    });

    return {
      headline: parsed.headline || rawInput.slice(0, 60) || "Untitled",
      narrative: parsed.narrative || rawInput,
      scores,
    };
  } catch (e) {
    console.error("AI parse error:", e);
    return {
      headline: rawInput.slice(0, 60) || "Untitled",
      narrative: rawInput,
      scores: TRACKING_POINTS.map((id) => ({
        pointId: id as TrackingPointId,
        score: 50,
      })),
    };
  }
}

export async function submitLifeUpdate(rawInput: string) {
  if (!rawInput?.trim()) return { ok: false, error: "Empty input" };

  const { headline, narrative, scores } = await parseUpdateWithAI(
    rawInput.trim()
  );
  const date = new Date().toISOString().slice(0, 10);

  await createLifeUpdate({
    headline,
    narrative,
    date,
    scores,
    rawInput: rawInput.trim(),
  });

  return { ok: true };
}

export async function fetchLifeUpdates(): Promise<LifeUpdateEntry[]> {
  const docs = await listLifeUpdates();
  return docs.map((d) => ({
    id: d.id,
    headline: d.headline,
    narrative: d.narrative,
    date: d.date,
    scores: d.scores,
    rawInput: d.rawInput,
  }));
}
