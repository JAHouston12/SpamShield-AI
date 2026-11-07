"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Mic, MicOff, Send, Volume2, VolumeX, X } from "lucide-react";

import { ShieldAvatar } from "@/components/assistant/shield-avatar";
import { useSiteControls } from "@/components/assistant/site-controls";
import { Button } from "@/components/ui/button";
import { CLIENT_API_BASE } from "@/lib/config";
import { COMMAND_EXAMPLES, parseCommand, QUESTION_EXAMPLES } from "@/lib/assistant/intents";
import { cn } from "@/lib/utils";

interface Message {
  role: "user" | "assistant";
  content: string;
  actions?: string[];
  sources?: { title: string; link: string }[];
  mode?: "local" | "gemini";
}

interface AssistantReply {
  answer: string;
  sources: { title: string; link: string }[];
  mode: "local" | "gemini";
}

type Recognition = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }) => void) | null;
  onend: (() => void) | null;
  onerror: ((e: { error: string }) => void) | null;
};

const GREETING =
  "Hi, I'm Shield, your security assistant. Tell me what to do with the site, like \"switch to light mode\" or \"play the training video\", or ask me a security question. You can type or tap the mic and speak.";
const SUGGESTIONS = [COMMAND_EXAMPLES[0], COMMAND_EXAMPLES[6], QUESTION_EXAMPLES[0], COMMAND_EXAMPLES[4], QUESTION_EXAMPLES[1], COMMAND_EXAMPLES[9]];

function getRecognition(): Recognition | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: new () => Recognition; webkitSpeechRecognition?: new () => Recognition };
  const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition;
  return Ctor ? new Ctor() : null;
}

export function Assistant() {
  const { run, assistantOpen: open, setAssistantOpen: setOpen, pendingPrompt, clearPendingPrompt } = useSiteControls();
  const [messages, setMessages] = useState<Message[]>([{ role: "assistant", content: GREETING }]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [listening, setListening] = useState(false);
  const [talking, setTalking] = useState(false);
  const [speak, setSpeak] = useState(true);
  const [voiceSupported, setVoiceSupported] = useState(false);
  const [bubble, setBubble] = useState(false);
  const recognition = useRef<Recognition | null>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setVoiceSupported(Boolean(getRecognition()));
    if (!sessionStorage.getItem("shield-greeted")) {
      const t = setTimeout(() => setBubble(true), 1500);
      const h = setTimeout(() => setBubble(false), 12000);
      sessionStorage.setItem("shield-greeted", "1");
      return () => {
        clearTimeout(t);
        clearTimeout(h);
      };
    }
  }, []);

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: "smooth" });
  }, [messages, busy]);

  useEffect(() => {
    if (open) {
      setBubble(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  const say = useCallback(
    (text: string) => {
      if (!speak || typeof window === "undefined" || !("speechSynthesis" in window)) return;
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text.replace(/https?:\/\/\S+/g, "").slice(0, 900));
      u.rate = 1.03;
      u.onstart = () => setTalking(true);
      u.onend = () => setTalking(false);
      u.onerror = () => setTalking(false);
      window.speechSynthesis.speak(u);
    },
    [speak],
  );

  const send = useCallback(
    async (raw: string) => {
      const text = raw.trim().slice(0, 500);
      if (!text || busy) return;
      setInput("");
      const history = messages.slice(-6).map(({ role, content }) => ({ role, content }));
      setMessages((m) => [...m, { role: "user", content: text }]);
      setBusy(true);

      const actions: string[] = [];
      const answers: AssistantReply[] = [];
      for (const action of parseCommand(text)) {
        if (action.type !== "question") {
          actions.push(run(action));
          continue;
        }
        try {
          const res = await fetch(`${CLIENT_API_BASE}/assistant`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ question: action.text.slice(0, 500), history }),
          });
          if (res.status === 429) throw new Error("rate");
          if (!res.ok) throw new Error(String(res.status));
          answers.push((await res.json()) as AssistantReply);
        } catch (e) {
          answers.push({
            answer:
              e instanceof Error && e.message === "rate"
                ? "You're asking quickly! Please wait a minute and try again."
                : "I couldn't reach my knowledge service just now. Website commands still work; please try the question again shortly.",
            sources: [],
            mode: "local",
          });
        }
      }

      const content = answers.map((a) => a.answer).join("\n\n");
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          content,
          actions,
          sources: answers.flatMap((a) => a.sources).slice(0, 3),
          mode: answers[0]?.mode,
        },
      ]);
      setBusy(false);
      say([...actions, content].filter(Boolean).join(" "));
    },
    [busy, messages, run, say],
  );

  useEffect(() => {
    if (open && pendingPrompt) {
      clearPendingPrompt();
      void send(pendingPrompt);
    }
  }, [open, pendingPrompt, clearPendingPrompt, send]);

  const toggleMic = () => {
    if (listening) {
      recognition.current?.stop();
      return;
    }
    const rec = getRecognition();
    if (!rec) return;
    window.speechSynthesis?.cancel();
    rec.lang = "en-US";
    rec.interimResults = true;
    rec.continuous = false;
    let finalText = "";
    rec.onresult = (e) => {
      const parts = Array.from(e.results);
      finalText = parts.map((r) => r[0].transcript).join(" ");
      setInput(finalText);
    };
    rec.onend = () => {
      setListening(false);
      if (finalText.trim()) void send(finalText);
    };
    rec.onerror = (e) => {
      setListening(false);
      if (e.error === "not-allowed") {
        setMessages((m) => [...m, { role: "assistant", content: "Microphone access was blocked. Allow it in your browser's site settings, or type instead." }]);
      }
    };
    recognition.current = rec;
    setListening(true);
    rec.start();
  };

  const avatarState = listening ? "listening" : talking ? "talking" : busy ? "thinking" : "idle";

  return (
    <div className="no-print">
      {bubble && !open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="fixed bottom-24 right-4 z-40 max-w-[260px] rounded-2xl rounded-br-sm border bg-card p-3 text-left text-sm shadow-xl sm:right-6"
        >
          <span className="font-medium text-primary">Hi, I&apos;m Shield!</span> I can change this site for you and answer security questions. Tap to chat or talk.
        </button>
      )}

      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-label={open ? "Close Shield assistant" : "Open Shield assistant"}
        aria-expanded={open}
        className="fixed bottom-4 right-4 z-40 flex h-16 w-16 items-center justify-center rounded-full border border-primary/40 bg-card shadow-lg shadow-primary/20 transition-transform hover:scale-105 sm:right-6"
      >
        <ShieldAvatar state={open ? avatarState : "idle"} className="h-11 w-11" />
      </button>

      {open && (
        <section
          aria-label="Shield assistant"
          className="fixed inset-x-0 bottom-0 z-50 flex h-[80vh] flex-col rounded-t-2xl border bg-card shadow-2xl sm:inset-x-auto sm:bottom-24 sm:right-6 sm:h-[600px] sm:max-h-[calc(100vh-8rem)] sm:w-[400px] sm:rounded-2xl"
        >
          <header className="flex items-center gap-3 border-b p-3">
            <ShieldAvatar state={avatarState} className="h-12 w-12" />
            <div className="min-w-0 flex-1">
              <p className="font-semibold leading-tight">Shield</p>
              <p className="truncate text-xs text-muted-foreground">
                {listening ? "Listening…" : talking ? "Speaking…" : busy ? "Thinking…" : "Security assistant · website control"}
              </p>
            </div>
            <Button
              size="icon"
              variant="ghost"
              onClick={() => {
                if (speak) window.speechSynthesis?.cancel();
                setSpeak(!speak);
              }}
              aria-label={speak ? "Mute spoken replies" : "Speak replies aloud"}
              aria-pressed={speak}
            >
              {speak ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
            </Button>
            <Button size="icon" variant="ghost" onClick={() => setOpen(false)} aria-label="Close assistant">
              <X className="h-4 w-4" />
            </Button>
          </header>

          <div ref={scroller} className="flex-1 space-y-3 overflow-y-auto p-3" aria-live="polite">
            {messages.map((m, i) => (
              <div key={i} className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}>
                <div
                  className={cn(
                    "max-w-[88%] whitespace-pre-line rounded-2xl px-3 py-2 text-sm leading-relaxed",
                    m.role === "user" ? "rounded-br-sm bg-primary text-primary-foreground" : "rounded-bl-sm bg-muted",
                  )}
                >
                  {m.actions && m.actions.length > 0 && (
                    <ul className={cn("space-y-0.5 text-xs font-medium text-primary", m.content && "mb-2")}>
                      {m.actions.map((a, j) => (
                        <li key={j}>✓ {a}</li>
                      ))}
                    </ul>
                  )}
                  {m.content}
                  {m.sources && m.sources.length > 0 && (
                    <p className="mt-2 flex flex-wrap gap-x-2 gap-y-1 text-[11px] text-muted-foreground">
                      <span>{m.mode === "gemini" ? "Gemini, grounded in:" : "From:"}</span>
                      {m.sources.map((s) =>
                        s.link ? (
                          <Link key={s.title} href={s.link} className="underline underline-offset-2 hover:text-foreground">
                            {s.title}
                          </Link>
                        ) : (
                          <span key={s.title}>{s.title}</span>
                        ),
                      )}
                    </p>
                  )}
                </div>
              </div>
            ))}
            {busy && (
              <div className="flex justify-start">
                <div className="rounded-2xl rounded-bl-sm bg-muted px-3 py-2 text-sm text-muted-foreground">Thinking…</div>
              </div>
            )}
            {messages.length === 1 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => void send(s)}
                    className="rounded-full border bg-background/60 px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>

          <form
            className="flex items-center gap-2 border-t p-3"
            onSubmit={(e) => {
              e.preventDefault();
              void send(input);
            }}
          >
            <Button
              type="button"
              size="icon"
              variant={listening ? "destructive" : "outline"}
              onClick={toggleMic}
              disabled={!voiceSupported || busy}
              aria-label={listening ? "Stop listening" : "Speak a command"}
              title={voiceSupported ? "Speak a command" : "Voice input needs Chrome or Edge"}
            >
              {listening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
            </Button>
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              maxLength={500}
              placeholder={listening ? "Listening…" : "Type a command or question"}
              aria-label="Message Shield"
              className="h-10 min-w-0 flex-1 rounded-md border bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
            <Button type="submit" size="icon" disabled={!input.trim() || busy} aria-label="Send">
              <Send className="h-4 w-4" />
            </Button>
          </form>
          <p className="px-3 pb-2 text-center text-[10px] text-muted-foreground">
            Shield only controls this website and can make mistakes. Don&apos;t share passwords or personal data.
          </p>
        </section>
      )}
    </div>
  );
}
