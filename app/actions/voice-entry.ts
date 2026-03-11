"use server";

import { GoogleGenAI, createUserContent, createPartFromBase64, createPartFromText } from "@google/genai";
import { submitLifeUpdate } from "./life-updates";

const SUPPORTED_MIMES = [
  "audio/wav",
  "audio/mp3",
  "audio/mpeg",
  "audio/webm",
  "audio/ogg",
  "audio/flac",
  "audio/aac",
  "audio/mp4",
];

export async function submitVoiceEntry(
  audioBase64: string,
  mimeType: string
): Promise<{ ok: boolean; error?: string }> {
  const normalizedMime = mimeType.toLowerCase().replace(/;.*$/, "").trim();
  if (!SUPPORTED_MIMES.includes(normalizedMime) && !normalizedMime.startsWith("audio/")) {
    return { ok: false, error: "Unsupported audio format. Use WAV, MP3, WebM, OGG, or FLAC." };
  }

  const apiKey =
    process.env.GOOGLE_GENERATIVE_AI_API_KEY ?? process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return { ok: false, error: "No Gemini API key configured" };
  }

  try {
    const ai = new GoogleGenAI({ apiKey });

    const res = await ai.models.generateContent({
      model: "gemini-2.0-flash-exp",
      contents: createUserContent([
        createPartFromBase64(audioBase64, normalizedMime),
        createPartFromText(
          "Transcribe this audio exactly as spoken. Output only the transcription, no other text, no punctuation unless clearly spoken."
        ),
      ]),
    });

    const raw = res as {
      text?: string;
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };
    let transcription =
      raw.text?.trim() ??
      raw.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ??
      "";

    if (!transcription) {
      return { ok: false, error: "Could not transcribe audio" };
    }

    return submitLifeUpdate(transcription);
  } catch (e) {
    console.error("Voice transcription error:", e);
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Transcription failed",
    };
  }
}
