"use server";

import { GoogleGenAI } from "@google/genai";
import {
  createLifeUpdate,
  listLifeUpdates,
  deleteLatestLifeUpdate,
  deleteAllLifeUpdates,
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

- **Love and Awareness**: Love, connection, emotional intelligence, self-awareness, compassion, care for self and others
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
→ Mindfulness 80–90 (primary), Love and Awareness 60–70 (secondary clarity)

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
    {"pointId": "Love and Awareness", "score": 0-100, "rationale": "brief reason or null if 50"},
    {"pointId": "Mindfulness", "score": 0-100, "rationale": "brief reason or null if 50"},
    {"pointId": "Intelligence", "score": 0-100, "rationale": "brief reason or null if 50"},
    {"pointId": "Cool", "score": 0-100, "rationale": "brief reason or null if 50"},
    {"pointId": "Technical Ability", "score": 0-100, "rationale": "brief reason or null if 50"},
    {"pointId": "Physical Presence", "score": 0-100, "rationale": "brief reason or null if 50"}
  ]
}

Every pointId must exactly match one of: ${TRACKING_POINTS_STR}`;

  const MODELS_TO_TRY = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-1.5-flash"];
  let lastError: unknown = null;

  for (const model of MODELS_TO_TRY) {
    try {
      const res = await ai.models.generateContent({
        model,
        contents: prompt,
        config: {
          responseMimeType: "application/json",
        },
      });

      const raw = res as { text?: string; candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
      let text = raw.text?.trim();
      if (!text && raw.candidates?.[0]?.content?.parts?.[0]?.text) {
        text = raw.candidates[0].content.parts[0].text.trim();
      }
      if (!text) throw new Error("Empty response from model");

      text = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) text = jsonMatch[0];

      let parsed: { headline?: string; narrative?: string; scores?: Array<{ pointId: string; score: number; rationale?: string }> };
      try {
        parsed = JSON.parse(text) as typeof parsed;
      } catch (parseErr) {
        console.error("JSON parse error. Raw text:", text?.slice(0, 500));
        throw parseErr;
      }
      if (!parsed?.scores?.length) throw new Error("Invalid response structure");

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
      lastError = e;
      console.error(`AI parse error (model ${model}):`, e);
    }
  }

  console.error("All models failed. Last error:", lastError);
  throw new Error(
    lastError instanceof Error
      ? lastError.message
      : "AI parsing failed. Please try again."
  );
}

export type ParsedLifeUpdate = {
  headline: string;
  narrative: string;
  scores: PointScore[];
  rawInput: string;
};

export async function parseLifeUpdate(
  rawInput: string
): Promise<{ ok: boolean; error?: string; parsed?: ParsedLifeUpdate }> {
  if (!rawInput?.trim()) return { ok: false, error: "Empty input" };

  const apiKey =
    process.env.GOOGLE_GENERATIVE_AI_API_KEY ?? process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return {
      ok: false,
      error:
        "Gemini API key not configured. Add GOOGLE_GENERATIVE_AI_API_KEY or GEMINI_API_KEY to .env.local",
    };
  }

  try {
    const { headline, narrative, scores } = await parseUpdateWithAI(
      rawInput.trim()
    );
    return {
      ok: true,
      parsed: {
        headline,
        narrative,
        scores,
        rawInput: rawInput.trim(),
      },
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, error: msg };
  }
}

export async function confirmLifeUpdate(
  parsed: ParsedLifeUpdate
): Promise<{ ok: boolean; error?: string }> {
  const date = new Date().toISOString().slice(0, 10);
  try {
    await createLifeUpdate({
      headline: parsed.headline,
      narrative: parsed.narrative,
      date,
      scores: parsed.scores,
      rawInput: parsed.rawInput,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("Could not load the default credentials")) {
      return {
        ok: false,
        error:
          "Firestore credentials not configured. Add GOOGLE_CLOUD_PROJECT and GOOGLE_SERVICE_ACCOUNT_KEY (base64) to .env.local. See .env.example.",
      };
    }
    throw err;
  }
  return { ok: true };
}

export async function rollbackLatest(): Promise<{ ok: boolean; error?: string }> {
  try {
    const deleted = await deleteLatestLifeUpdate();
    return { ok: deleted };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, error: msg };
  }
}

export async function rebuildAll(): Promise<{ ok: boolean; count?: number; error?: string }> {
  try {
    const count = await deleteAllLifeUpdates();
    return { ok: true, count };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, error: msg };
  }
}

/** Create a life update with random scores (1-100) for all points. Returns ok and optional error. */
export async function branchHostConstruct(): Promise<{ ok: boolean; error?: string }> {
  try {
    const scores: PointScore[] = TRACKING_POINTS.map((pointId) => ({
      pointId,
      score: Math.floor(Math.random() * 100) + 1,
    }));
    const date = new Date().toISOString().slice(0, 10);
    await createLifeUpdate({
      headline: "Branched: random baseline",
      narrative: "BRANCH HOST CONSTRUCT — random values assigned to all points.",
      date,
      scores,
      rawInput: "[BRANCH]",
    });
    return { ok: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, error: msg };
  }
}

export async function fetchLifeUpdates(): Promise<LifeUpdateEntry[]> {
  const docs = await listLifeUpdates();
  // #region agent log
  fetch('http://127.0.0.1:7384/ingest/a6f14ac3-126a-4fd8-96cb-f88dd4ec32e1',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'f064e3'},body:JSON.stringify({sessionId:'f064e3',location:'life-updates.ts:fetchLifeUpdates',message:'fetchLifeUpdates result',data:{count:docs.length,lastHeadline:docs[docs.length-1]?.headline},timestamp:Date.now(),hypothesisId:'H5'})}).catch(()=>{});
  // #endregion
  return docs.map((d) => ({
    id: d.id,
    headline: d.headline,
    narrative: d.narrative,
    date: d.date,
    scores: d.scores,
    rawInput: d.rawInput,
  }));
}
