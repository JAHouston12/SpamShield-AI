import type { Metadata } from "next";
import { Activity, AlertTriangle, Globe2, KeyRound, LogIn, ShieldAlert } from "lucide-react";

import { BarChart } from "@/components/charts/bar-chart";
import { COLORS } from "@/components/charts/theme";
import { PageHeader } from "@/components/layout/page-header";
import { CodeBlock } from "@/components/report/code-block";
import { ChartCard } from "@/components/sections/chart-card";
import { Insight } from "@/components/sections/insight";
import { Section } from "@/components/sections/section";
import { StatCard } from "@/components/sections/stat-card";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import seclog from "@/data/generated/seclog.json";
import { num, pct } from "@/lib/format";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Security Monitor" };

const SEVERITY: Record<string, string> = {
  critical: "border-spam/50 bg-spam/15 text-spam",
  high: "border-warning/50 bg-warning/15 text-warning",
  medium: "border-primary/40 bg-primary/10 text-primary",
  low: "border-border bg-muted text-muted-foreground",
};

const LEVEL_TONE: Record<string, string> = {
  Severe: "text-spam border-spam/50 bg-spam/10",
  High: "text-warning border-warning/50 bg-warning/10",
  Elevated: "text-warning border-warning/40 bg-warning/5",
  Guarded: "text-primary border-primary/40 bg-primary/5",
  Low: "text-ham border-ham/40 bg-ham/10",
};

const fmtTime = (iso: string) =>
  new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "UTC" });

export default function MonitorPage() {
  const { totals, threat, comparison: c } = seclog;
  const rows: [string, string, string][] = [
    ["Source IPs", num(c.normal.ips), num(c.suspicious.ips)],
    ["Events per IP per active hour", String(c.normal.events_per_ip_hour), String(c.suspicious.events_per_ip_hour)],
    ["Login failure rate", pct(c.normal.login_failure_rate), pct(c.suspicious.login_failure_rate)],
    ["Usernames tried per IP", String(c.normal.usernames_per_ip), String(c.suspicious.usernames_per_ip)],
    ["Requests matching attack signatures", num(c.normal.signature_hits), num(c.suspicious.signature_hits)],
    ["HTTP error responses (4xx/5xx)", pct(c.normal.error_share), pct(c.suspicious.error_share)],
  ];

  return (
    <>
      <PageHeader
        eyebrow="Security · Monitoring"
        title="Security Monitoring Dashboard"
        description={`Seven days of web and login logs for a demo storefront (${fmtTime(seclog.window.start)} to ${fmtTime(seclog.window.end)} UTC), analysed with six detection rules. The log is synthetic with planted incidents, so every rule has something real to find and no live system was attacked.`}
      >
        <div className={cn("inline-flex items-center gap-3 rounded-xl border px-4 py-3", LEVEL_TONE[threat.level])}>
          <ShieldAlert className="h-6 w-6" aria-hidden />
          <div>
            <p className="text-xs font-medium uppercase tracking-wider opacity-80">Threat level</p>
            <p className="text-xl font-semibold">
              {threat.level} <span className="font-mono text-sm opacity-80">({threat.score}/100)</span>
            </p>
          </div>
        </div>
      </PageHeader>

      <div className="mb-14 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard label="Total login attempts" value={num(totals.login_attempts)} hint={`${num(totals.events)} events in total`} icon={LogIn} />
        <StatCard label="Failed login attempts" value={num(totals.failed_logins)} hint={pct(totals.failed_logins / totals.login_attempts) + " of attempts"} icon={KeyRound} tone="warning" />
        <StatCard label="Suspicious IP addresses" value={num(totals.suspicious_ips)} hint={`of ${num(totals.unique_ips)} unique IPs`} icon={Globe2} tone="spam" />
        <StatCard label="Detected attacks" value={num(totals.detected_attacks)} hint={`${seclog.attacks_by_type.length} attack types`} icon={AlertTriangle} tone="spam" />
        <StatCard label="Security events" value={num(totals.security_events)} hint="Log lines from flagged IPs" icon={Activity} tone="primary" />
        <StatCard label="Threat score" value={`${threat.score}/100`} hint="Weighted by incident severity" icon={ShieldAlert} tone="spam" />
      </div>

      <Section id="activity" title="Activity over the week" description="Normal traffic follows a daytime rhythm; attacks show up as sudden bursts.">
        <div className="grid gap-4 lg:grid-cols-2">
          <ChartCard title="Normal vs suspicious events per day" interpretation="Saturday's spike is the HTTP flood: 8,200 requests from 90 bot IPs in ten minutes.">
            <BarChart
              data={seclog.days}
              xKey="day"
              stacked
              series={[
                { key: "normal", label: "Normal", color: COLORS.ham },
                { key: "suspicious", label: "Suspicious", color: COLORS.spam },
              ]}
              ariaLabel="Normal and suspicious events per day"
            />
          </ChartCard>
          <ChartCard title="Failed logins per hour" interpretation="Normal users fail a login now and then; the 02:00 Tuesday and 03:00 Thursday towers are brute force and credential stuffing.">
            <BarChart
              data={seclog.hourly_failed_logins}
              xKey="hour"
              series={[{ key: "failed", label: "Failed logins", color: COLORS.warning }]}
              ariaLabel="Failed logins per hour"
            />
          </ChartCard>
          <ChartCard title="Attacks by type" description="Log events attributed to each incident type">
            <BarChart
              data={seclog.attacks_by_type}
              xKey="type"
              layout="vertical"
              categoryWidth={190}
              series={[{ key: "events", label: "Events", color: COLORS.spam }]}
              ariaLabel="Events per attack type"
            />
          </ChartCard>
          <ChartCard title="Daily threat score" description="Sum of incident severity weights per day (capped at 100)">
            <BarChart
              data={seclog.days}
              xKey="day"
              domain={[0, 100]}
              series={[{ key: "threat", label: "Threat score", color: COLORS.violet }]}
              ariaLabel="Threat score per day"
            />
          </ChartCard>
        </div>
      </Section>

      <Section id="incidents" title="Detected attacks" description="Each incident shows the rule that fired and the evidence behind it.">
        <ul className="space-y-3">
          {seclog.incidents.map((i) => (
            <li key={i.id}>
              <Card className="bg-card/70">
                <CardContent className="flex flex-col gap-2 p-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs text-muted-foreground">{i.id}</span>
                      <Badge variant="outline" className={cn("capitalize", SEVERITY[i.severity])}>{i.severity}</Badge>
                      <span className="font-medium">{i.type}</span>
                    </div>
                    <p className="break-words text-sm text-foreground/90">{i.detail}</p>
                    <p className="text-xs text-muted-foreground">Rule: {i.rule}</p>
                  </div>
                  <div className="shrink-0 text-xs text-muted-foreground sm:text-right">
                    <p>{fmtTime(i.start)} UTC</p>
                    <p className="font-mono">{i.ips.length === 1 ? i.ips[0] : `${i.ips.length} IPs`}</p>
                  </div>
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      </Section>

      <Section id="ips" title="Suspicious IP addresses" description="Top offenders (a sample of the 90 flood IPs is included).">
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="bg-muted/50 text-left text-muted-foreground">
              <tr>
                <th scope="col" className="px-3 py-2 font-medium">IP</th>
                <th scope="col" className="px-3 py-2 font-medium">Country</th>
                <th scope="col" className="px-3 py-2 font-medium">Attack</th>
                <th scope="col" className="px-3 py-2 text-right font-medium">Events</th>
                <th scope="col" className="px-3 py-2 text-right font-medium">Failed logins</th>
                <th scope="col" className="px-3 py-2 font-medium">Last seen (UTC)</th>
              </tr>
            </thead>
            <tbody>
              {seclog.top_ips.map((r) => (
                <tr key={r.ip} className="border-t">
                  <td className="px-3 py-2 font-mono text-xs">{r.ip}</td>
                  <td className="px-3 py-2">{r.country}</td>
                  <td className="px-3 py-2">{r.types.join(", ")}</td>
                  <td className="px-3 py-2 text-right font-mono text-xs">{num(r.events)}</td>
                  <td className="px-3 py-2 text-right font-mono text-xs">{num(r.failed_logins)}</td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">{fmtTime(r.last_seen)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <Section id="behaviour" title="Normal vs suspicious behaviour" description="The same metrics computed for flagged IPs and for everyone else.">
        <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full min-w-[420px] text-sm">
              <thead className="bg-muted/50 text-muted-foreground">
                <tr>
                  <th scope="col" className="px-3 py-2 text-left font-medium">Metric</th>
                  <th scope="col" className="px-3 py-2 text-right font-medium text-ham">Normal</th>
                  <th scope="col" className="px-3 py-2 text-right font-medium text-spam">Suspicious</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(([label, n, s]) => (
                  <tr key={label} className="border-t">
                    <td className="px-3 py-2">{label}</td>
                    <td className="px-3 py-2 text-right font-mono text-xs">{n}</td>
                    <td className="px-3 py-2 text-right font-mono text-xs">{s}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Insight title="What separates them">
            <ul className="list-disc space-y-1.5 pl-5">
              <li>Normal visitors make a couple of requests an hour, use one account, and rarely fail to log in.</li>
              <li>Attackers are fast and repetitive: dozens of requests per hour, the same URL or login form over and over.</li>
              <li>Credential stuffing tries many usernames from one IP; brute force hammers one username.</li>
              <li>Injection probes carry SQL or script syntax that real users never type into a URL.</li>
              <li>Floods look normal per request but arrive from many IPs at once, so rate monitoring catches them, not signatures.</li>
            </ul>
          </Insight>
        </div>
      </Section>

      <Section id="rules" title="Detection rules and raw log" description="Simple, explainable rules; the script is backend/ml/seclog.py (run make seclog).">
        <div className="grid gap-4 lg:grid-cols-2">
          <dl className="grid gap-x-6 gap-y-2 rounded-lg border bg-background/40 p-4 text-sm sm:grid-cols-[max-content_1fr]">
            {seclog.rules.map((r) => (
              <div key={r.name} className="contents">
                <dt className="font-medium text-muted-foreground">{r.name}</dt>
                <dd>{r.logic}</dd>
              </div>
            ))}
          </dl>
          <CodeBlock code={seclog.sample_lines.join("\n")} lang="log" title="Sample log lines" />
        </div>
      </Section>
    </>
  );
}
