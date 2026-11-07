"use client";

import Link from "next/link";
import { Activity, Bot, Mic, ShieldCheck } from "lucide-react";

import { useSiteControls } from "@/components/assistant/site-controls";
import { DocRenderer } from "@/components/report/doc-renderer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { A8_SECTIONS } from "@/content/assignment8";
import { COMMAND_EXAMPLES, QUESTION_EXAMPLES } from "@/lib/assistant/intents";

const DEMO =
  "Hello! Change the background to dark blue, play the cybersecurity training video, and teach me how to recognize phishing attacks";

export function AssistantReport() {
  const { openAssistant } = useSiteControls();

  return (
    <div className="space-y-10">
      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="space-y-4 p-5">
          <div className="flex items-start gap-3">
            <Bot className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden />
            <div>
              <p className="font-semibold">Try Shield now</p>
              <p className="text-sm text-muted-foreground">
                Open the assistant (bottom-right on every page), then type or press <Mic className="inline h-3.5 w-3.5" aria-label="the mic button" /> and
                speak. Or run an example:
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={() => openAssistant(DEMO)}>
              Run the full demo request
            </Button>
            {[COMMAND_EXAMPLES[1], COMMAND_EXAMPLES[4], QUESTION_EXAMPLES[1]].map((c) => (
              <Button key={c} size="sm" variant="outline" onClick={() => openAssistant(c)}>
                {c}
              </Button>
            ))}
            <Button size="sm" variant="ghost" onClick={() => openAssistant(COMMAND_EXAMPLES[9])}>
              Reset appearance
            </Button>
          </div>
          <div className="flex flex-wrap gap-4 text-sm">
            <Link href="/monitor" className="inline-flex items-center gap-1.5 text-primary hover:underline">
              <Activity className="h-4 w-4" aria-hidden />
              Security Monitor dashboard
            </Link>
            <span className="inline-flex items-center gap-1.5 text-muted-foreground">
              <ShieldCheck className="h-4 w-4" aria-hidden />
              Only whitelisted website actions; nothing on your computer is touched
            </span>
          </div>
        </CardContent>
      </Card>

      <DocRenderer sections={A8_SECTIONS} />
    </div>
  );
}
