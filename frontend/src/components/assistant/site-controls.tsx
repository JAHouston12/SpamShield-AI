"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import type { Action } from "@/lib/assistant/intents";
import { AmbientPlayer, TRACKS } from "@/lib/assistant/music";

interface Appearance {
  theme: "dark" | "light";
  bg: { color: string; hsl: string } | null;
  bgImage: boolean;
  textScale: number;
}

const DEFAULT: Appearance = { theme: "dark", bg: null, bgImage: false, textScale: 1 };
const STORAGE_KEY = "shield-appearance";
const SCALES = [0.875, 1, 1.125, 1.25, 1.375];

interface SiteControls {
  run: (action: Exclude<Action, { type: "question" }>) => string;
  musicPlaying: boolean;
  videoOpen: boolean;
  closeVideo: () => void;
  assistantOpen: boolean;
  setAssistantOpen: (open: boolean) => void;
  /** Opens the assistant panel, optionally pre-sending a prompt. */
  openAssistant: (prompt?: string) => void;
  pendingPrompt: string | null;
  clearPendingPrompt: () => void;
}

const Ctx = createContext<SiteControls | null>(null);

export function useSiteControls() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useSiteControls must be used inside SiteControlsProvider");
  return ctx;
}

function apply(a: Appearance) {
  const html = document.documentElement;
  html.classList.toggle("theme-light", a.theme === "light");
  html.classList.toggle("dark", a.theme === "dark");
  html.classList.toggle("bg-image", a.bgImage);
  html.classList.toggle("bg-color", Boolean(a.bg));
  if (a.bg) html.style.setProperty("--background", a.bg.hsl);
  else html.style.removeProperty("--background");
  html.style.fontSize = a.textScale === 1 ? "" : `${a.textScale * 100}%`;
}

export function SiteControlsProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [appearance, setAppearance] = useState<Appearance>(DEFAULT);
  const [musicPlaying, setMusicPlaying] = useState(false);
  const [videoOpen, setVideoOpen] = useState(false);
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [pendingPrompt, setPendingPrompt] = useState<string | null>(null);
  const player = useRef<AmbientPlayer | null>(null);
  const loaded = useRef(false);
  const current = useRef(appearance);
  current.current = appearance;

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) setAppearance({ ...DEFAULT, ...JSON.parse(saved) });
    } catch {
      /* ignore corrupt storage */
    }
    loaded.current = true;
    return () => player.current?.stop();
  }, []);

  useEffect(() => {
    apply(appearance);
    if (loaded.current) localStorage.setItem(STORAGE_KEY, JSON.stringify(appearance));
  }, [appearance]);

  const run = useCallback<SiteControls["run"]>(
    (action) => {
      switch (action.type) {
        case "background":
          setAppearance((a) => ({ ...a, bg: { color: action.color, hsl: action.hsl }, bgImage: false, theme: action.light ? "light" : "dark" }));
          return `Background changed to ${action.color}.`;
        case "backgroundImage":
          setAppearance((a) => ({ ...a, bgImage: true, bg: null }));
          return "Background set to the computer security image.";
        case "theme":
          setAppearance((a) => ({ ...a, theme: action.mode, bg: a.bg && action.mode === "dark" ? null : a.bg }));
          return `Switched to ${action.mode} mode.`;
        case "textSize": {
          const cur = current.current.textScale;
          const i = SCALES.indexOf(cur);
          const next = action.dir === "reset" ? 1 : SCALES[Math.max(0, Math.min(SCALES.length - 1, i + (action.dir === "up" ? 1 : -1)))];
          setAppearance((a) => ({ ...a, textScale: next }));
          if (next === cur) return `Text is already at its ${action.dir === "up" ? "largest" : action.dir === "down" ? "smallest" : "normal"} size.`;
          return action.dir === "reset" ? "Text size back to normal." : `Text made ${action.dir === "up" ? "larger" : "smaller"}.`;
        }
        case "music": {
          player.current ??= new AmbientPlayer();
          const p = player.current;
          if (action.op === "pause") {
            p.stop();
            setMusicPlaying(false);
            return "Music paused.";
          }
          if (action.op === "next") p.next();
          else p.play();
          setMusicPlaying(true);
          return `${action.op === "next" ? "Changed the music to" : "Playing"} "${TRACKS[p.track].name}".`;
        }
        case "video":
          setVideoOpen(action.op === "play");
          if (action.op === "play" && player.current?.playing) {
            player.current.stop();
            setMusicPlaying(false);
          }
          return action.op === "play" ? "Playing the cybersecurity training video (the Assignment 7 movie)." : "Video closed.";
        case "navigate":
          router.push(action.href);
          return `Opening ${action.label}.`;
        case "scroll": {
          const h = window.innerHeight * 0.8;
          if (action.dir === "top") window.scrollTo({ top: 0, behavior: "smooth" });
          else if (action.dir === "bottom") window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
          else window.scrollBy({ top: action.dir === "down" ? h : -h, behavior: "smooth" });
          return `Scrolled ${action.dir === "top" || action.dir === "bottom" ? `to the ${action.dir}` : action.dir}.`;
        }
        case "reset":
          setAppearance(DEFAULT);
          player.current?.stop();
          setMusicPlaying(false);
          setVideoOpen(false);
          return "Restored the original appearance.";
        case "greet":
          return "Hello! I'm Shield, this site's security assistant.";
        case "help":
          return "I can change the background color or set a security image, switch dark or light mode, resize text, play, pause, or change music, play the training video, scroll, open any page or assignment, and reset everything. I also answer security questions: try 'How do I spot a phishing email?'";
      }
    },
    [router],
  );

  const value = useMemo<SiteControls>(
    () => ({
      run,
      musicPlaying,
      videoOpen,
      closeVideo: () => setVideoOpen(false),
      assistantOpen,
      setAssistantOpen,
      openAssistant: (prompt) => {
        setAssistantOpen(true);
        if (prompt) setPendingPrompt(prompt);
      },
      pendingPrompt,
      clearPendingPrompt: () => setPendingPrompt(null),
    }),
    [run, musicPlaying, videoOpen, assistantOpen, pendingPrompt],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
