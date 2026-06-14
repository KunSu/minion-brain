"use client";

/**
 * Thin wrapper over the browser Web Speech API (SpeechRecognition).
 *
 * Progressive enhancement: `supported` is false on browsers without it (notably
 * Firefox), so callers can hide the mic and fall back to typing. Language is
 * explicit (en-US / zh-CN) — the API does not auto-detect bilingual speech.
 *
 * The Web Speech types aren't in the standard TS lib, so we declare the minimal
 * surface we use here.
 */
import * as React from "react";

export type SpeechLang = "en-US" | "zh-CN";

interface SpeechRecognitionAlternativeLike {
  transcript: string;
}
interface SpeechRecognitionResultLike {
  0: SpeechRecognitionAlternativeLike;
  isFinal: boolean;
}
interface SpeechRecognitionEventLike {
  resultIndex: number;
  results: ArrayLike<SpeechRecognitionResultLike>;
}
interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((e: SpeechRecognitionEventLike) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
}
type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

function getCtor(): SpeechRecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function useSpeechRecognition(opts: {
  lang: SpeechLang;
  /** Called with the full transcript when the user stops or speech finalizes. */
  onResult: (text: string) => void;
}) {
  const { lang, onResult } = opts;
  const [supported] = React.useState(() => getCtor() !== null);
  const [listening, setListening] = React.useState(false);
  const [interim, setInterim] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);

  const recognitionRef = React.useRef<SpeechRecognitionLike | null>(null);
  const finalRef = React.useRef("");
  // Keep the latest onResult without re-creating the recognizer.
  const onResultRef = React.useRef(onResult);
  React.useEffect(() => {
    onResultRef.current = onResult;
  }, [onResult]);

  const stop = React.useCallback(() => {
    recognitionRef.current?.stop();
  }, []);

  const start = React.useCallback(() => {
    const Ctor = getCtor();
    if (!Ctor) {
      setError("Speech recognition is not supported in this browser.");
      return;
    }
    setError(null);
    finalRef.current = "";
    setInterim("");

    const rec = new Ctor();
    rec.lang = lang;
    rec.continuous = true;
    rec.interimResults = true;

    rec.onresult = (e) => {
      let interimText = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const result = e.results[i];
        const text = result[0].transcript;
        if (result.isFinal) finalRef.current += text;
        else interimText += text;
      }
      setInterim(interimText);
    };
    rec.onerror = (e) => {
      setError(e.error || "Speech recognition error");
    };
    rec.onend = () => {
      setListening(false);
      setInterim("");
      const text = finalRef.current.trim();
      if (text) onResultRef.current(text);
    };

    recognitionRef.current = rec;
    rec.start();
    setListening(true);
  }, [lang]);

  // Clean up if the component unmounts mid-listen.
  React.useEffect(() => {
    return () => recognitionRef.current?.abort();
  }, []);

  return { supported, listening, interim, error, start, stop };
}
