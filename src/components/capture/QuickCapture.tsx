"use client";

import * as React from "react";
import { Mic, Plus, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useSpeechRecognition, type SpeechLang } from "@/hooks/useSpeechRecognition";
import { useHydrated } from "@/hooks/useHydrated";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import type { CreateItemInput } from "@/lib/types";

const LANG_KEY = "minion-brain:lang";
const isLang = (v: string): v is SpeechLang => v === "en-US" || v === "zh-CN";

/**
 * Always-present capture bar. Type a line + Enter to create an idea in the Inbox.
 * The mic uses the browser's speech recognition as a progressive enhancement —
 * it's hidden entirely on browsers that don't support it (e.g. Firefox), so the
 * text input is always the reliable path.
 */
export function QuickCapture({
  onCreate,
  autoFocusKey,
}: {
  onCreate: (input: CreateItemInput) => Promise<unknown> | void;
  /** Bump this number to programmatically focus the input (e.g. the `c` shortcut). */
  autoFocusKey?: number;
}) {
  const [value, setValue] = React.useState("");
  const [lang, setLang] = useLocalStorage<SpeechLang>(LANG_KEY, "en-US", isLang);
  const hydrated = useHydrated();
  const inputRef = React.useRef<HTMLInputElement>(null);

  const { supported, listening, interim, error, start, stop } = useSpeechRecognition({
    lang,
    onResult: (text) => setValue((v) => (v ? `${v} ${text}` : text)),
  });

  // Only reveal voice controls after hydration: feature detection runs on the
  // client only, so gating here keeps the first client render matching the SSR.
  const showVoice = hydrated && supported;

  React.useEffect(() => {
    if (autoFocusKey !== undefined && autoFocusKey > 0) inputRef.current?.focus();
  }, [autoFocusKey]);

  async function submit() {
    const title = value.trim();
    if (!title) return;
    setValue("");
    await onCreate({ title });
  }

  function toggleLang() {
    setLang(lang === "en-US" ? "zh-CN" : "en-US");
  }

  return (
    <div>
      <div
        className={cn(
          "flex items-center gap-2 rounded-2xl border bg-surface p-2 shadow-sm",
          "focus-within:ring-2 focus-within:ring-ring",
          listening && "ring-2 ring-rose-300",
        )}
      >
        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-accent-soft text-accent">
          <Plus className="h-5 w-5" />
        </div>
        <Input
          ref={inputRef}
          value={listening && interim ? `${value} ${interim}`.trim() : value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              void submit();
            }
          }}
          placeholder={listening ? "Listening…" : "Capture an idea, todo, topic, or feature…"}
          className="border-0 bg-transparent shadow-none focus-visible:ring-0 h-9"
          aria-label="Quick capture"
        />

        {showVoice && (
          <>
            <button
              type="button"
              onClick={toggleLang}
              className="shrink-0 rounded-md px-1.5 py-1 text-xs font-medium text-muted hover:bg-accent-soft hover:text-foreground"
              title="Dictation language"
              aria-label={`Dictation language: ${lang === "en-US" ? "English" : "中文"}`}
            >
              {lang === "en-US" ? "EN" : "中"}
            </button>
            <Button
              type="button"
              variant={listening ? "default" : "ghost"}
              size="icon"
              onClick={() => (listening ? stop() : start())}
              title={listening ? "Stop" : "Voice capture"}
              aria-label={listening ? "Stop voice capture" : "Start voice capture"}
              className={cn(listening && "bg-rose-500 text-white hover:bg-rose-500/90")}
            >
              {listening ? <Square className="h-4 w-4" /> : <Mic className="h-5 w-5" />}
            </Button>
          </>
        )}

        <Button type="button" size="sm" onClick={() => void submit()} disabled={!value.trim()}>
          Add
        </Button>
      </div>
      {error && (
        <p className="mt-1.5 px-2 text-xs text-rose-600">{error}</p>
      )}
    </div>
  );
}
