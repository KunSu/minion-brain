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

/** Map raw SpeechRecognition error codes to a user-facing (Chinese) message. */
function mapSpeechError(code: string, isIOS: boolean): string {
  switch (code) {
    case "not-allowed":
    case "service-not-allowed":
      return "麦克风权限被拒绝。请在浏览器设置里允许麦克风,或直接打字。";
    case "audio-capture":
      return "找不到麦克风。请检查设备,或直接打字。";
    case "network":
      return "语音识别需要联网,网络异常。请重试或直接打字。";
    case "language-not-supported":
      return "当前语言不支持语音识别,请切换 EN/中 或直接打字。";
    default:
      return isIOS
        ? "语音识别出错。iPhone 上支持不稳定 —— 建议用键盘的听写麦克风,或直接打字。"
        : "语音识别出错,请重试或直接打字。";
  }
}

function getCtor(): SpeechRecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

/**
 * iOS detection. Every iOS browser (Chrome, Edge, Firefox included) is forced to
 * use WebKit, whose SpeechRecognition engine is flaky: `start()` frequently ends
 * immediately with no result and no error. We use this to show a more honest
 * message and point the user at the keyboard's built-in dictation mic instead.
 * Includes iPadOS 13+, which reports as a Mac but has touch support.
 */
function getIsIOS(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  const iOSDevice = /iPad|iPhone|iPod/.test(ua);
  const iPadOS = navigator.platform === "MacIntel" && (navigator.maxTouchPoints ?? 0) > 1;
  return iOSDevice || iPadOS;
}

export function useSpeechRecognition(opts: {
  lang: SpeechLang;
  /** Called with the full transcript when the user stops or speech finalizes. */
  onResult: (text: string) => void;
}) {
  const { lang, onResult } = opts;
  // iOS (all browsers use WebKit) exposes webkitSpeechRecognition but the engine
  // is unreliable — start() often fires `end` immediately with no result and no
  // error. We surface a clearer hint there and treat "ended with nothing" as a
  // soft failure rather than silently doing nothing (the "pressed, no reaction"
  // bug). See getIsIOS below.
  const [supported] = React.useState(() => getCtor() !== null);
  const isIOS = React.useMemo(() => getIsIOS(), []);
  const [listening, setListening] = React.useState(false);
  const [interim, setInterim] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);

  const recognitionRef = React.useRef<SpeechRecognitionLike | null>(null);
  const finalRef = React.useRef("");
  // Latest interim (non-final) transcript, so onend can fall back to it if the
  // user stopped before the engine finalized.
  const interimRef = React.useRef("");
  // True once we've received any result signal this session, so `onend` can tell
  // "user actually said something" from "engine no-op'd" (the iOS bug).
  const gotSignalRef = React.useRef(false);
  // Guards against setState after unmount (continuous mode + abort() in cleanup
  // still fires onend).
  const mountedRef = React.useRef(true);
  // True once onerror has set a specific message this session, so onend's
  // generic "heard nothing" fallback doesn't overwrite it (onerror is typically
  // followed by onend — e.g. a `not-allowed` permission denial).
  const erroredRef = React.useRef(false);
  // Keep the latest onResult without re-creating the recognizer.
  const onResultRef = React.useRef(onResult);
  React.useEffect(() => {
    onResultRef.current = onResult;
  }, [onResult]);

  const stop = React.useCallback(() => {
    recognitionRef.current?.stop();
  }, []);

  // Let the UI clear a stale error message once the user starts typing or
  // successfully submits, so a past voice failure doesn't linger next to an
  // already-cleared input.
  const clearError = React.useCallback(() => setError(null), []);

  const start = React.useCallback(() => {
    const Ctor = getCtor();
    if (!Ctor) {
      setError("Speech recognition is not supported in this browser.");
      return;
    }
    setError(null);
    finalRef.current = "";
    interimRef.current = "";
    gotSignalRef.current = false;
    erroredRef.current = false;
    setInterim("");

    const rec = new Ctor();
    rec.lang = lang;
    rec.continuous = true;
    rec.interimResults = true;

    rec.onresult = (e) => {
      gotSignalRef.current = true;
      let interimText = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const result = e.results[i];
        const text = result[0].transcript;
        if (result.isFinal) finalRef.current += text;
        else interimText += text;
      }
      interimRef.current = interimText;
      setInterim(interimText);
    };
    rec.onerror = (e) => {
      // "no-speech"/"aborted" are benign stops; let onend handle the messaging so
      // we don't double-report. Surface only genuine errors here.
      if (e.error && e.error !== "no-speech" && e.error !== "aborted") {
        erroredRef.current = true;
        setError(mapSpeechError(e.error, isIOS));
      }
    };
    rec.onend = () => {
      if (!mountedRef.current) return;
      setListening(false);
      setInterim("");
      // Prefer finalized text; fall back to whatever interim we had captured
      // (e.g. user hit Stop before the engine finalized the utterance) so their
      // words aren't dropped.
      const text = (finalRef.current || interimRef.current).trim();
      if (text) {
        onResultRef.current(text);
        return;
      }
      // A specific error (e.g. permission denied) was already surfaced by
      // onerror, which fires just before onend — don't clobber it.
      if (erroredRef.current) return;
      // The engine sent a signal (onresult) but produced no usable text — this
      // is a normal "started, said nothing intelligible / stopped early" case,
      // not the silent-failure bug. Don't nag with an error.
      if (gotSignalRef.current) return;
      // Ended with NO signal at all. Previously this did nothing — the "pressed
      // the mic, spoke, nothing happened" bug (common on iOS WebKit, whose
      // engine no-ops start()). Give an actionable message instead of failing
      // silently.
      setError(
        isIOS
          ? "没听到内容。iPhone 上语音识别不稳定 —— 建议用键盘上的听写麦克风,或直接打字。"
          : "没听到内容,请再试一次或直接打字。",
      );
    };

    recognitionRef.current = rec;
    try {
      rec.start();
    } catch {
      // Some engines throw if start() is called twice; treat as a soft failure.
      setListening(false);
      setError(mapSpeechError("", isIOS));
      return;
    }
    setListening(true);
  }, [lang, isIOS]);

  // Clean up if the component unmounts mid-listen. Mark unmounted first and
  // detach handlers so abort()'s onend doesn't setState on a dead component.
  React.useEffect(() => {
    return () => {
      mountedRef.current = false;
      const rec = recognitionRef.current;
      if (rec) {
        rec.onresult = null;
        rec.onerror = null;
        rec.onend = null;
        rec.abort();
      }
    };
  }, []);

  return { supported, isIOS, listening, interim, error, start, stop, clearError };
}
