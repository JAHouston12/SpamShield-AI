import { Clapperboard } from "lucide-react";

import type { Assignment } from "@/content/assignments";

export function AssignmentVideo({ video }: { video: NonNullable<Assignment["video"]> }) {
  const ready = Boolean(video.src || video.youtubeId);

  return (
    <section id="movie" aria-labelledby="movie-h" className="scroll-mt-24">
      <h2 id="movie-h" className="mb-4 border-b pb-2 text-xl font-semibold tracking-tight">
        AI movie
      </h2>
      <div className="overflow-hidden rounded-xl border bg-black">
        {video.youtubeId ? (
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${video.youtubeId}`}
            title={video.title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="aspect-video w-full"
          />
        ) : video.src ? (
          <video controls preload="metadata" playsInline className="aspect-video w-full" aria-label={video.title}>
            <source src={video.src} type="video/mp4" />
            Your browser can&apos;t play this video. <a href={video.src}>Download it instead.</a>
          </video>
        ) : (
          <div className="flex aspect-video flex-col items-center justify-center gap-3 bg-card p-6 text-center">
            <Clapperboard className="h-10 w-10 text-muted-foreground" aria-hidden />
            <p className="font-medium">Movie coming soon</p>
            <p className="max-w-md text-sm text-muted-foreground">
              The Google Flow movie for this assignment is being produced and will play here once it&apos;s uploaded.
            </p>
          </div>
        )}
      </div>
      <p className="mt-2 text-sm text-muted-foreground">
        {video.title}
        {ready && video.caption ? ` · ${video.caption}` : ""}
      </p>
    </section>
  );
}
