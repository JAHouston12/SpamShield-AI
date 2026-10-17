"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Loader2,
  RotateCcw,
  ScanSearch,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Timer,
  WifiOff,
} from "lucide-react";

import { ConfidenceGauge } from "@/components/detector/confidence-gauge";
import { HighlightedMessage } from "@/components/detector/highlighted-message";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { MAX_CHARS, PRESETS } from "@/content/detector";
import { ApiError, compareModels, predict } from "@/lib/client-api";
import { cn } from "@/lib/utils";
import type { CompareResponse, DetectionMode, PredictResponse } from "@/types/prediction";

interface ModelOption {
  key: string;
  name: string;
  role: string;
}

type Status = "idle" | "loading" | "success" | "error";

const RISK_TONE: Record<string, string> = {
  low: "border-ham/40 bg-ham/10 text-ham",
  elevated: "border-warning/40 bg-warning/10 text-warning",
  high: "border-spam/40 bg-spam/10 text-spam",
  critical: "border-spam/60 bg-spam/20 text-spam",
};

export function DetectorPanel({ models, defaultModel }: { models: ModelOption[]; defaultModel: string }) {
  const [text, setText] = useState(PRESETS[0].text);
  const [model, setModel] = useState(defaultModel);
  const [mode, setMode] = useState<DetectionMode>("hybrid");
  const [status, setStatus] = useState<Status>("idle");
  const [result, setResult] = useState<PredictResponse | null>(null);
  const [consensus, setConsensus] = useState<CompareResponse | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [analyzed, setAnalyzed] = useState("");
  const abortRef = useRef<AbortController | null>(null);
  const resultRef = useRef<HTMLDivElement>(null);

  const trimmed = text.trim();
  const tooLong = text.length > MAX_CHARS;

  const run = useCallback(
    async (input: string, m: string, md: DetectionMode) => {
      if (!input.trim() || input.length > MAX_CHARS) return;
      abortRef.current?.abort();
      const ctrl = new AbortController();
      abortRef.current = ctrl;
      setStatus("loading");
      setError(null);
      setConsensus(null);
      try {
        const res = await predict(input, m, md, ctrl.signal);
        setResult(res);
        setAnalyzed(input.trim());
        setStatus("success");
        if (window.matchMedia("(max-width: 1023px)").matches) resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
        compareModels(input, md, ctrl.signal).then(setConsensus).catch(() => undefined);
      } catch (e) {
        if ((e as Error).name === "AbortError") return;
        setError(e instanceof ApiError ? e : new ApiError("Unexpected error"));
        setStatus("error");
      }
    },
    [],
  );

  useEffect(() => () => abortRef.current?.abort(), []);

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      run(text, model, mode);
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
      <Card className="h-fit bg-card/70 lg:sticky lg:top-6">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Message</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div>
            <label htmlFor="message" className="sr-only">
              Message to analyze
            </label>
            <Textarea
              id="message"
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={onKeyDown}
              rows={6}
              placeholder="Paste an SMS message to analyze…"
              className="resize-y bg-background/60 text-base leading-relaxed"
              aria-describedby="message-help"
              aria-invalid={tooLong}
            />
            <div id="message-help" className="mt-1.5 flex justify-between text-xs text-muted-foreground">
              <span>
                <kbd className="rounded border bg-muted px-1 font-mono">Ctrl</kbd> + <kbd className="rounded border bg-muted px-1 font-mono">Enter</kbd> to analyze
              </span>
              <span className={cn("font-mono", tooLong && "text-spam")}>
                {text.length.toLocaleString()} / {MAX_CHARS.toLocaleString()}
              </span>
            </div>
          </div>

          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Try an example</p>
            <div className="flex flex-wrap gap-1.5">
              {PRESETS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => {
                    setText(p.text);
                    run(p.text, model, mode);
                  }}
                  className={cn(
                    "rounded-full border px-2.5 py-1 text-xs transition-colors",
                    p.category === "spam" ? "hover:border-spam/50 hover:text-spam" : "hover:border-ham/50 hover:text-ham",
                    text === p.text ? (p.category === "spam" ? "border-spam/50 text-spam" : "border-ham/50 text-ham") : "text-muted-foreground",
                  )}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="model" className="mb-2 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Model
              </label>
              <Select value={model} onValueChange={setModel}>
                <SelectTrigger id="model" className="bg-background/60">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {models.map((m) => (
                    <SelectItem key={m.key} value={m.key}>
                      {m.name}
                      {m.role === "baseline" ? " (baseline)" : m.role === "improved" ? " (improved)" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <p id="mode-label" className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Detection mode
              </p>
              <Tabs value={mode} onValueChange={(v) => setMode(v as DetectionMode)}>
                <TabsList className="grid w-full grid-cols-2" aria-labelledby="mode-label">
                  <TabsTrigger value="hybrid">Hybrid</TabsTrigger>
                  <TabsTrigger value="ml">ML only</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </div>
          <p className="-mt-2 text-xs leading-relaxed text-muted-foreground">
            {mode === "hybrid"
              ? "Hybrid adds weighted threat signals (links, credential lures, urgency) to the model's log-odds, capped so rules alone cannot override a confident model."
              : "ML only reports the trained model's probability with no heuristic adjustment."}
          </p>

          <Button className="w-full" size="lg" onClick={() => run(text, model, mode)} disabled={!trimmed || tooLong || status === "loading"}>
            {status === "loading" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ScanSearch className="mr-2 h-4 w-4" />}
            {status === "loading" ? "Analyzing…" : "Analyze message"}
          </Button>
        </CardContent>
      </Card>

      <div ref={resultRef} className="scroll-mt-20 space-y-5" aria-live="polite" aria-busy={status === "loading"}>
        {status === "idle" && (
          <Card className="border-dashed bg-card/40">
            <CardContent className="flex flex-col items-center justify-center gap-3 py-20 text-center">
              <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 ring-1 ring-primary/30">
                <Sparkles className="h-5 w-5 text-primary" aria-hidden />
              </span>
              <p className="font-semibold">Ready to scan</p>
              <p className="max-w-sm text-sm text-muted-foreground">
                Analyze the example message or paste your own. You&apos;ll get a classification, a confidence score, threat signals,
                and an explanation of which words drove the decision.
              </p>
            </CardContent>
          </Card>
        )}

        {status === "loading" && (
          <Card className="bg-card/70">
            <CardContent className="space-y-4 p-6">
              <Skeleton className="h-8 w-40" />
              <Skeleton className="mx-auto h-32 w-56 rounded-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-4/5" />
              <Skeleton className="h-24 w-full" />
            </CardContent>
          </Card>
        )}

        {status === "error" && error && (
          <Alert variant="destructive" className="border-spam/40 bg-spam/5">
            {error.offline ? <WifiOff className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
            <AlertTitle>{error.offline ? "Detection API unreachable" : "Analysis failed"}</AlertTitle>
            <AlertDescription className="space-y-3">
              <p>
                {error.offline
                  ? "The FastAPI backend is not responding. Start it with `make api` (port 8417), then retry."
                  : error.message}
              </p>
              <Button size="sm" variant="outline" onClick={() => run(text, model, mode)}>
                <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Retry
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {status === "success" && result && (
          <>
            <Card className={cn("animate-fade-up overflow-hidden", result.is_spam ? "border-spam/40" : "border-ham/40")}>
              <div className={cn("h-1", result.is_spam ? "bg-spam" : "bg-ham")} aria-hidden />
              <CardContent className="p-6">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Prediction</p>
                    <div className="mt-1 flex items-center gap-2">
                      {result.is_spam ? <ShieldAlert className="h-7 w-7 text-spam" aria-hidden /> : <ShieldCheck className="h-7 w-7 text-ham" aria-hidden />}
                      <p className={cn("text-3xl font-bold tracking-tight", result.is_spam ? "text-spam" : "text-ham")}>
                        {result.is_spam ? "SPAM" : "HAM"}
                      </p>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">{result.is_spam ? "Likely malicious or unwanted" : "Likely legitimate"}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1.5">
                    <Badge variant="outline" className={cn("capitalize", RISK_TONE[result.risk_level])}>
                      {result.risk_level} risk
                    </Badge>
                    <Badge variant="secondary" className="font-normal">{result.model.name}</Badge>
                    <span className="flex items-center gap-1 font-mono text-[11px] text-muted-foreground">
                      <Timer className="h-3 w-3" aria-hidden /> {result.latency_ms} ms
                    </span>
                  </div>
                </div>

                <div className="mt-6 grid items-center gap-6 sm:grid-cols-[1fr_1fr]">
                  <ConfidenceGauge probability={result.spam_probability} threshold={result.threshold} spam={result.is_spam} />
                  <dl className="grid grid-cols-2 gap-3 text-sm">
                    <div className="rounded-lg border bg-background/50 p-3">
                      <dt className="text-xs text-muted-foreground">Confidence</dt>
                      <dd className="font-mono text-lg font-semibold">{(result.confidence * 100).toFixed(1)}%</dd>
                    </div>
                    <div className="rounded-lg border bg-background/50 p-3">
                      <dt className="text-xs text-muted-foreground">Threshold</dt>
                      <dd className="font-mono text-lg font-semibold">{result.threshold}</dd>
                    </div>
                    <div className="rounded-lg border bg-background/50 p-3">
                      <dt className="text-xs text-muted-foreground">Model score</dt>
                      <dd className="font-mono text-lg font-semibold">{(result.ml_probability * 100).toFixed(1)}%</dd>
                    </div>
                    <div className="rounded-lg border bg-background/50 p-3">
                      <dt className="text-xs text-muted-foreground">Signal boost</dt>
                      <dd className="font-mono text-lg font-semibold">{result.mode === "hybrid" ? `+${result.heuristic_boost}` : "off"}</dd>
                    </div>
                  </dl>
                </div>

                <div className="mt-6 rounded-lg border border-primary/20 bg-primary/5 p-4">
                  <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-primary">Summary explanation</p>
                  <p className="text-sm leading-relaxed text-foreground/90">{result.explanation}</p>
                </div>
              </CardContent>
            </Card>

            <div className="grid gap-5 md:grid-cols-2">
              <Card className="bg-card/70">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Threat signals</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {result.signals.map((s) => (
                      <li key={s.id} className="flex items-start gap-2.5 text-sm">
                        {s.detected ? (
                          <AlertTriangle className={cn("mt-0.5 h-4 w-4 shrink-0", s.severity === "high" ? "text-spam" : "text-warning")} aria-hidden />
                        ) : (
                          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground/50" aria-hidden />
                        )}
                        <div className="min-w-0">
                          <p className={s.detected ? "text-foreground" : "text-muted-foreground"}>
                            {s.label}
                            <span className="sr-only">{s.detected ? " detected" : " not detected"}</span>
                          </p>
                          {s.detected && <p className="truncate font-mono text-xs text-muted-foreground">{s.detail}</p>}
                        </div>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>

              <Card className="bg-card/70">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Word-level attribution</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="rounded-lg border bg-background/50 p-3">
                    <HighlightedMessage text={analyzed} contributions={result.contributions} />
                  </div>
                  <ul className="space-y-1.5">
                    {result.contributions.slice(0, 6).map((c) => {
                      const max = Math.max(...result.contributions.map((x) => Math.abs(x.contribution)), 0.01);
                      return (
                        <li key={c.feature} className="grid grid-cols-[7.5rem_1fr_3.5rem] items-center gap-2 text-xs">
                          <span className="truncate font-mono" title={c.feature}>{c.feature}</span>
                          <span className="h-1.5 rounded-full bg-muted">
                            <span
                              className={cn("block h-full rounded-full", c.direction === "spam" ? "bg-spam" : "bg-ham")}
                              style={{ width: `${(Math.abs(c.contribution) / max) * 100}%` }}
                            />
                          </span>
                          <span className={cn("text-right font-mono", c.direction === "spam" ? "text-spam" : "text-ham")}>
                            {c.contribution > 0 ? "+" : ""}
                            {c.contribution.toFixed(2)}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                  <p className="text-[11px] text-muted-foreground">Linear SHAP attributions from the baseline explainer, in log-odds.</p>
                </CardContent>
              </Card>
            </div>

            <Card className="bg-card/70">
              <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm">Model consensus</CardTitle>
                {consensus && (
                  <Badge variant="outline" className={consensus.consensus === "spam" ? "border-spam/40 text-spam" : "border-ham/40 text-ham"}>
                    {consensus.spam_votes} / {consensus.total} vote spam
                  </Badge>
                )}
              </CardHeader>
              <CardContent>
                {!consensus ? (
                  <div className="grid gap-2 sm:grid-cols-2">
                    {Array.from({ length: 4 }).map((_, i) => (
                      <Skeleton key={i} className="h-7 w-full" />
                    ))}
                  </div>
                ) : (
                  <ul className="grid gap-x-6 gap-y-2 sm:grid-cols-2">
                    {consensus.votes.map((v) => (
                      <li key={v.key} className="grid grid-cols-[1fr_4.5rem_3rem] items-center gap-2 text-xs">
                        <span className={cn("truncate", v.key === result.model.key && "font-semibold text-primary")}>{v.name}</span>
                        <span className="relative h-1.5 rounded-full bg-muted" aria-hidden>
                          <span className={cn("absolute inset-y-0 left-0 rounded-full", v.label === "spam" ? "bg-spam" : "bg-ham")} style={{ width: `${v.spam_probability * 100}%` }} />
                          <span className="absolute -top-0.5 h-2.5 w-px bg-foreground" style={{ left: `${v.threshold * 100}%` }} />
                        </span>
                        <span className={cn("text-right font-mono", v.label === "spam" ? "text-spam" : "text-ham")}>{(v.spam_probability * 100).toFixed(0)}%</span>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}
