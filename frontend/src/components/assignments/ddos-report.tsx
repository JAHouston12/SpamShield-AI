import { Activity, Gauge, Network, ShieldCheck } from "lucide-react";

import { BarChart } from "@/components/charts/bar-chart";
import { COLORS } from "@/components/charts/theme";
import { ConfusionMatrix } from "@/components/evaluation/confusion-matrix";
import { DocRenderer } from "@/components/report/doc-renderer";
import { ChartCard } from "@/components/sections/chart-card";
import { StatCard } from "@/components/sections/stat-card";
import { A7_SECTIONS, DDOS } from "@/content/assignment7";
import { num, pct } from "@/lib/format";

const TRAFFIC_LABELS = {
  negative: "Benign",
  positive: "DDoS",
  desc: ["Normal traffic served", "Real visitor blocked", "Attack flow reached server", "Attack flow dropped"],
} satisfies { negative: string; positive: string; desc: [string, string, string, string] };

const CLASS_SERIES = [
  { key: "benign", label: "Benign", color: COLORS.ham },
  { key: "attack", label: "DDoS", color: COLORS.spam },
];

const sections = (...ids: string[]) => A7_SECTIONS.filter((s) => ids.includes(s.id));

export function DdosReport() {
  const all = [...DDOS.detectors, ...DDOS.models];
  const rf = DDOS.models.find((m) => m.name === "Random Forest")!;
  const volumeRule = DDOS.detectors[0];
  const total = DDOS.class_counts.reduce((s, c) => s + c.count, 0);
  const attack = DDOS.class_counts.find((c) => c.label === "DDoS")?.count ?? 0;

  const ports = Array.from(new Set([...DDOS.ports.benign, ...DDOS.ports.attack].map((p) => p.port))).map((port) => ({
    port: String(port),
    benign: DDOS.ports.benign.find((p) => p.port === port)?.share ?? 0,
    attack: DDOS.ports.attack.find((p) => p.port === port)?.share ?? 0,
  }));
  const metrics = all.map((d) => ({ name: d.name, precision: d.precision, recall: d.recall, f1: d.f1 }));

  return (
    <div className="space-y-10">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Flows analysed" value={num(total)} hint="After removing NaN/inf and duplicates" icon={Network} />
        <StatCard label="Attack share" value={pct(attack / total)} hint={`${num(attack)} DDoS flows`} icon={Activity} tone="spam" />
        <StatCard label="Random Forest F1" value={pct(rf.f1, 2)} hint={`${rf.cm.fn} missed · ${rf.cm.fp} false alarms`} icon={ShieldCheck} tone="ham" />
        <StatCard label="Volume rule F1" value={pct(volumeRule.f1, 2)} hint="Per-flow speed alone fails" icon={Gauge} tone="warning" />
      </div>

      <DocRenderer sections={sections("problem", "dos-vs-ddos", "dataset", "methods")} />

      <section aria-labelledby="viz-h" className="scroll-mt-24" id="visualizations">
        <h2 id="viz-h" className="mb-4 border-b pb-2 text-xl font-semibold tracking-tight">
          Visualizations: normal vs attack traffic
        </h2>
        <div className="grid gap-4 lg:grid-cols-2">
          <ChartCard
            title="Flow rate (packets/s)"
            description="Share of each class per log-scale bin"
            interpretation="Attack flows cluster at low per-flow rates; the fastest flows in the capture are benign. Speed per connection does not reveal this flood."
          >
            <BarChart data={DDOS.histograms["Flow Packets/s"]} xKey="bin" series={CLASS_SERIES} format="percent0" ariaLabel="Packets per second distribution, benign vs DDoS" />
          </ChartCard>
          <ChartCard
            title="Mean packet length (bytes)"
            description="Share of each class per log-scale bin"
            interpretation="DDoS flows carry larger average packets: the server's full HTTP responses to each flood request."
          >
            <BarChart data={DDOS.histograms["Packet Length Mean"]} xKey="bin" series={CLASS_SERIES} format="percent0" ariaLabel="Packet length distribution, benign vs DDoS" />
          </ChartCard>
          <ChartCard
            title="Forward bytes per flow"
            description="Share of each class per log-scale bin"
            interpretation="Each attack flow sends only a few dozen bytes: tiny, repeated requests."
          >
            <BarChart data={DDOS.histograms["Total Length of Fwd Packets"]} xKey="bin" series={CLASS_SERIES} format="percent0" ariaLabel="Forward bytes distribution, benign vs DDoS" />
          </ChartCard>
          <ChartCard
            title="Destination ports"
            description="Share of each class's flows by target port"
            interpretation="Normal traffic spreads across DNS, HTTPS, and HTTP. The attack hits a single port: the web server."
          >
            <BarChart data={ports} xKey="port" series={CLASS_SERIES} format="percent0" ariaLabel="Destination port share, benign vs DDoS" />
          </ChartCard>
          <ChartCard
            title="Correlation with the attack label"
            description="Pearson correlation, top 10 features"
            interpretation="Packet-size features carry the strongest signal; flow rate is weakly negative."
          >
            <BarChart
              data={DDOS.correlations}
              xKey="feature"
              series={[{ key: "corr", label: "Correlation", color: COLORS.primary }]}
              layout="vertical"
              categoryWidth={170}
              height={340}
              format="decimal2"
              domain={[-1, 1]}
              ariaLabel="Feature correlation with attack label"
            />
          </ChartCard>
          <ChartCard
            title="Random Forest feature importance"
            description="Top 10 features (mean decrease in impurity)"
            interpretation="The model keys on request shape: forward packet size, packet count, and TCP window."
          >
            <BarChart
              data={DDOS.importances}
              xKey="feature"
              series={[{ key: "importance", label: "Importance", color: COLORS.violet }]}
              layout="vertical"
              categoryWidth={170}
              height={340}
              format="decimal2"
              ariaLabel="Random Forest feature importance"
            />
          </ChartCard>
        </div>
      </section>

      <DocRenderer sections={sections("findings")} />

      <section aria-labelledby="det-h" className="scroll-mt-24" id="detection">
        <h2 id="det-h" className="mb-4 border-b pb-2 text-xl font-semibold tracking-tight">
          Detection methods compared
        </h2>
        <ChartCard title="Precision, recall, and F1 by method" description={`Held-out test set, ${num(DDOS.preprocessing.test_rows)} flows`}>
          <BarChart
            data={metrics}
            xKey="name"
            series={[
              { key: "precision", label: "Precision", color: COLORS.primary },
              { key: "recall", label: "Recall", color: COLORS.violet },
              { key: "f1", label: "F1", color: COLORS.ham },
            ]}
            layout="vertical"
            categoryWidth={150}
            format="percent0"
            domain={[0, 1]}
            height={420}
            ariaLabel="Precision, recall and F1 for each detection method"
          />
        </ChartCard>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {all.map((d) => (
            <ConfusionMatrix key={d.name} name={d.name} cm={d.cm} compact highlight={d.name === "Random Forest"} labels={TRAFFIC_LABELS} />
          ))}
        </div>
      </section>

      <DocRenderer sections={sections("results", "conclusion")} />
    </div>
  );
}
