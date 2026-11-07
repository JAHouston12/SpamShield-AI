"use client";

import { useEffect } from "react";
import { X } from "lucide-react";

import { useSiteControls } from "@/components/assistant/site-controls";
import { Button } from "@/components/ui/button";

export const TRAINING_VIDEO = { src: "/videos/assignment-7.mp4", poster: "/videos/assignment-7-poster.jpg" };

export function VideoOverlay() {
  const { videoOpen, closeVideo } = useSiteControls();

  useEffect(() => {
    if (!videoOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && closeVideo();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [videoOpen, closeVideo]);

  if (!videoOpen) return null;
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Cybersecurity training video"
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
      onClick={closeVideo}
    >
      <div className="w-full max-w-4xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-2 flex items-center justify-between text-white">
          <p className="text-sm font-medium">Cybersecurity training video: restoring availability after a DDoS attack</p>
          <Button size="icon" variant="ghost" onClick={closeVideo} aria-label="Close video" className="text-white hover:bg-white/10">
            <X className="h-5 w-5" />
          </Button>
        </div>
        <video
          src={TRAINING_VIDEO.src}
          poster={TRAINING_VIDEO.poster}
          controls
          autoPlay
          playsInline
          className="aspect-video w-full rounded-xl border border-white/10 bg-black"
        />
        <p className="mt-2 text-xs text-white/70">Say or type &quot;close the video&quot;, press Esc, or click outside to close.</p>
      </div>
    </div>
  );
}
