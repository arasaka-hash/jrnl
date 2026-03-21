"use server";

import {
  GoogleGenAI,
  createUserContent,
  createPartFromBase64,
  createPartFromText,
} from "@google/genai";
import type { ParsedLifeUpdate } from "./life-updates";
import type { PointScore, TrackingPointId } from "@/lib/types";
import { TRACKING_POINTS } from "@/lib/types";

const TRACKING_POINTS_STR = TRACKING_POINTS.join(", ");

const SUPPORTED_MIMES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
]);

/** ~4.5MB raw image cap (base64 inflates ~33%) */
const MAX_BASE64_CHARS = 6_500_000;

const MODELS_TO_TRY = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-2.5-flash-lite"];
const PARSE_TIMEOUT_MS = 25_000;

function buildPhotoPrompt(): string {
  return `You are parsing a qualitative life update from a PHOTO the user uploaded. Infer what is happening: activity, environment, mood, social context, health/fitness cues, work/tech if visible, etc. Map what you observe to the neural profile tracking points.

## Tracking points (score 0–100 each)

- **Love and Awareness**: Love, connection, emotional intelligence, self-awareness, compassion, care for self and others
- **Mindfulness**: Focus, presence, meditation, calm, mental clarity, being in the moment
- **Intelligence**: Problem-solving, learning, adaptability, reasoning, curiosity, knowledge
- **Cool**: Personal brand, influence, style, confidence, social presence, charisma
- **Technical Ability**: Coding, tools, AI, remote work, shipping features, technical execution
- **Physical Presence**: Health, energy, fitness, sleep, body, executive presence, vitality

## Rules

1. Only score points clearly supported by what you see. Use 50 for neutral / not inferable.
2. Score 0–100 reflects positive impact implied by the scene (higher = stronger positive signal for that dimension).
3. Typical photos affect 1–3 points; be specific (e.g. gym → Physical Presence; laptop/code on screen → Technical Ability).
4. If the image is unclear or unrelated to life context, still produce a short headline and narrative describing what you see, with most scores at 50.

Respond with valid JSON only, no markdown:
{
  "headline": "Short 3-8 word summary",
  "narrative": "2-4 sentences describing the scene and inferred life-update meaning",
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
}

function normalizeScores(
  parsed: { scores?: Array<{ pointId: string; score: number; rationale?: string }> }
): PointScore[] {
  return TRACKING_POINTS.map((id) => {
    const found = parsed.scores?.find(
      (s) => s.pointId === id || s.pointId?.replace(/\s+/g, " ") === id
    );
    return {
      pointId: id as TrackingPointId,
      score: Math.min(100, Math.max(0, found?.score ?? 50)),
      rationale: found?.rationale,
    };
  });
}

export async function submitPhotoEntry(
  imageBase64: string,
  mimeType: string
): Promise<{ ok: boolean; error?: string; parsed?: ParsedLifeUpdate }> {
  const normalizedMime = mimeType.toLowerCase().replace(/;.*$/, "").trim();
  if (!SUPPORTED_MIMES.has(normalizedMime)) {
    return {
      ok: false,
      error: "Unsupported image type. Use JPEG, PNG, WebP, or GIF.",
    };
  }

  if (!imageBase64 || imageBase64.length > MAX_BASE64_CHARS) {
    return {
      ok: false,
      error: "Image too large. Use a photo under about 4MB.",
    };
  }

  const apiKey =
    process.env.GOOGLE_GENERATIVE_AI_API_KEY ?? process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return { ok: false, error: "No Gemini API key configured" };
  }

  const ai = new GoogleGenAI({ apiKey });
  const prompt = buildPhotoPrompt();
  let lastError: unknown = null;

  for (const model of MODELS_TO_TRY) {
    try {
      const controller = new AbortController();
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
          controller.abort();
          reject(new Error("Parse timed out. Try a smaller image."));
        }, PARSE_TIMEOUT_MS);
      });

      const res = await Promise.race([
        ai.models.generateContent({
          model,
          contents: createUserContent([
            createPartFromBase64(imageBase64, normalizedMime),
            createPartFromText(prompt),
          ]),
          config: {
            responseMimeType: "application/json",
            abortSignal: controller.signal,
          },
        }),
        timeoutPromise,
      ]);

      const raw = res as {
        text?: string;
        candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
      };
      let text =
        (typeof raw.text === "string" ? raw.text : null)?.trim() ??
        raw.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ??
        "";
      if (!text) {
        console.error(`Photo parse empty response (model ${model})`);
        throw new Error("Empty response from model");
      }

      text = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) text = jsonMatch[0];

      let parsedJson: {
        headline?: string;
        narrative?: string;
        scores?: Array<{ pointId: string; score: number; rationale?: string }>;
      };
      try {
        parsedJson = JSON.parse(text) as typeof parsedJson;
      } catch (parseErr) {
        console.error("Photo JSON parse error. Raw:", text?.slice(0, 500));
        throw parseErr;
      }
      if (!parsedJson?.scores?.length) throw new Error("Invalid response structure");

      const scores = normalizeScores(parsedJson);
      const headline =
        parsedJson.headline?.trim() || "Photo update";
      const narrative = parsedJson.narrative?.trim() || "Life update from uploaded photo.";

      const parsed: ParsedLifeUpdate = {
        headline,
        narrative,
        scores,
        rawInput: `[Photo] ${headline}`,
      };

      return { ok: true, parsed };
    } catch (e) {
      lastError = e;
      const isTimeout =
        e instanceof Error &&
        (e.message.includes("timed out") || e.name === "AbortError");
      console.error(
        `Photo parse error (model ${model}):`,
        isTimeout ? "Request timed out" : e
      );
    }
  }

  const msg =
    lastError instanceof Error ? lastError.message : "Photo parsing failed.";
  return { ok: false, error: msg };
}
