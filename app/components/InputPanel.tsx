"use client";

import { useState, useRef } from "react";
import { submitLifeUpdate } from "@/app/actions/life-updates";
import { submitVoiceEntry } from "@/app/actions/voice-entry";

export interface InputPanelProps {
  onSubmitted: () => void;
}

export function InputPanel({ onSubmitted }: InputPanelProps) {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recording, setRecording] = useState(false);
  const [voiceLoading, setVoiceLoading] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  async function handleVoiceSubmit(audioBlob: Blob, mimeType: string) {
    setVoiceLoading(true);
    setError(null);
    try {
      const reader = new FileReader();
      const base64 = await new Promise<string>((resolve, reject) => {
        reader.onloadend = () => {
          const result = reader.result as string;
          const base64 = result.split(",")[1];
          resolve(base64 ?? "");
        };
        reader.onerror = reject;
        reader.readAsDataURL(audioBlob);
      });
      if (!base64) throw new Error("Failed to read audio");
      const res = await submitVoiceEntry(base64, mimeType);
      if (res.ok) {
        onSubmitted();
      } else {
        setError(res.error ?? "Voice submission failed");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Voice submission failed");
    } finally {
      setVoiceLoading(false);
    }
  }

  function handleRecordStart() {
    chunksRef.current = [];
    navigator.mediaDevices.getUserMedia({ audio: true }).then((stream) => {
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        if (chunksRef.current.length > 0) {
          const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
          handleVoiceSubmit(blob, blob.type);
        }
      };
      recorder.start();
      setRecording(true);
    }).catch(() => setError("Microphone access denied"));
  }

  function handleRecordStop() {
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
      setRecording(false);
    }
  }

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file?.type.startsWith("audio/")) {
      setError("Please select an audio file (WAV, MP3, WebM, etc.)");
      return;
    }
    handleVoiceSubmit(file, file.type);
    e.target.value = "";
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await submitLifeUpdate(input);
      // #region agent log
      fetch('http://127.0.0.1:7384/ingest/a6f14ac3-126a-4fd8-96cb-f88dd4ec32e1',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'f064e3'},body:JSON.stringify({sessionId:'f064e3',location:'InputPanel.tsx:handleSubmit',message:'submitLifeUpdate result',data:{ok:res.ok,error:res.error,input},timestamp:Date.now(),hypothesisId:'H2'})}).catch(()=>{});
      // #endregion
      if (res.ok) {
        setInput("");
        onSubmitted();
      } else {
        setError(res.error ?? "Failed to save");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="input-panel-hud relative h-full flex flex-col overflow-hidden">
      <div className="input-corner input-tl" aria-hidden />
      <div className="input-corner input-tr" aria-hidden />
      <div className="input-corner input-bl" aria-hidden />
      <div className="input-corner input-br" aria-hidden />
      <div className="absolute top-7 left-10 z-10 pointer-events-none">
        <span className="text-cyan-500/80 font-mono tracking-tight uppercase text-[1.2rem]">
          INPUT
        </span>
        <span className="ml-4 text-cyan-500/50 font-mono animate-pulse text-[1.2rem] tracking-tight">
          ● LIVE
        </span>
      </div>
      <div className="absolute inset-0 pointer-events-none opacity-[0.03]" style={{ background: "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,255,136,0.1) 2px, rgba(0,255,136,0.1) 4px)" }} aria-hidden />
      <div className="relative flex-1 flex flex-col pt-14">
      <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0">
        <div className="flex-1 p-4">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder=""
            className="w-full h-full min-h-[120px] bg-black/50 border border-cyan-500/30 rounded px-3 py-2 text-cyan-100 placeholder-cyan-500/40 focus:outline-none focus:ring-1 focus:ring-cyan-500/50 focus:border-cyan-500/50 resize-none"
            disabled={loading}
          />
        </div>
        {error && (
          <div className="px-4 pb-2 text-red-400 text-sm">{error}</div>
        )}
        <div className="p-4 pt-0 space-y-3">
          <button
            type="submit"
            disabled={loading || voiceLoading || !input.trim()}
            className="w-full py-2.5 px-4 bg-cyan-600/90 hover:bg-cyan-500 disabled:bg-cyan-900/30 disabled:cursor-not-allowed text-black font-bold tracking-widest uppercase border border-cyan-400/50 hover:border-cyan-300 disabled:border-cyan-800/50 transition-all hover:shadow-[0_0_20px_rgba(0,255,136,0.3)] font-mono"
          >
            {loading ? "PARSING..." : "SUBMIT"}
          </button>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={recording ? handleRecordStop : handleRecordStart}
              disabled={loading || voiceLoading}
              className={`flex-1 py-2 px-3 font-mono text-xs tracking-wider uppercase border transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                recording
                  ? "bg-red-600/80 border-red-500/60 text-white animate-pulse"
                  : "bg-black/50 border-cyan-500/40 text-cyan-400 hover:border-cyan-500/60"
              }`}
            >
              {recording ? "● STOP" : "🎤 RECORD"}
            </button>
            <label className="flex-1 py-2 px-3 font-mono text-xs tracking-wider uppercase border border-cyan-500/40 bg-black/50 text-cyan-400 hover:border-cyan-500/60 cursor-pointer text-center disabled:opacity-50 disabled:cursor-not-allowed">
              <input
                type="file"
                accept="audio/*"
                onChange={handleFileUpload}
                disabled={loading || voiceLoading}
                className="hidden"
              />
              UPLOAD
            </label>
          </div>
          {voiceLoading && (
            <p className="text-cyan-500/70 text-xs font-mono">Transcribing...</p>
          )}
        </div>
      </form>
      </div>
    </div>
  );
}
