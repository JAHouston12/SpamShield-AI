import ddos from "@/data/generated/ddos.json";
import type { DocSection } from "@/content/report";
import { num, pct } from "@/lib/format";

export type DdosData = typeof ddos;
export const DDOS = ddos;

const detector = (name: string) => [...ddos.detectors, ...ddos.models].find((d) => d.name === name)!;
const vol = (feature: string) => ddos.volume.find((v) => v.feature === feature)!;
const count = (label: string) => ddos.class_counts.find((c) => c.label === label)?.count ?? 0;

const rf = detector("Random Forest");
const lr = detector("Logistic Regression");
const volumeRule = detector("Volume threshold");
const stump = detector("Single-feature rule");
const iso = detector("Isolation Forest");
const pps = vol("Flow Packets/s");
const fwdBytes = vol("Total Length of Fwd Packets");
const pktMean = vol("Packet Length Mean");
const benign = count("BENIGN");
const attack = count("DDoS");
const p = ddos.preprocessing;

export const RESEARCH_QUESTION =
  "Can data-driven methods detect the abnormal network traffic of a DDoS attack, and which kinds of method (statistical thresholds, anomaly detection, or supervised machine learning) work best?";

export const A7_SECTIONS: DocSection[] = [
  {
    id: "problem",
    title: "1. Research problem and objectives",
    blocks: [
      {
        type: "p",
        text: "A website is only useful while it is available. Denial-of-Service attacks try to take it offline by exhausting the server's bandwidth, connections, or CPU with traffic it cannot tell apart from real visitors. This study uses a public, labelled capture of real attack traffic to measure how normal and attack flows differ and whether those differences are strong enough to detect the attack automatically.",
      },
      { type: "callout", title: "Research question", text: RESEARCH_QUESTION },
      {
        type: "list",
        ordered: true,
        items: [
          "Explain the difference between DoS and DDoS attacks and how each affects availability.",
          "Characterise normal and attack traffic in a public dataset (volume, size, timing, ports, TCP flags).",
          "Test whether a simple traffic-volume threshold is enough to catch the attack.",
          "Compare a statistical rule, an unsupervised anomaly detector, and two supervised ML models using precision, recall, F1, and confusion matrices.",
          "Relate the results back to keeping a website available.",
        ],
      },
    ],
  },
  {
    id: "dos-vs-ddos",
    title: "2. DoS vs DDoS",
    blocks: [
      {
        type: "table",
        textOnly: true,
        head: ["Aspect", "DoS", "DDoS"],
        rows: [
          ["Sources", "One machine / one connection", "Many machines (often a botnet), many IPs"],
          ["Typical volume", "Limited by one host's bandwidth", "Aggregate of thousands of hosts; can exceed the target's link"],
          ["Blocking", "Block or rate-limit a single IP", "IP blocking fails; traffic must be filtered by behaviour"],
          ["Examples", "Slowloris, single-host HTTP flood", "LOIC/HOIC floods, Mirai, reflection/amplification (DNS, NTP, memcached)"],
          ["Layer", "Often application layer (L7)", "Volumetric (L3/L4) or application layer (L7)"],
        ],
      },
      {
        type: "p",
        text: "Both attacks aim at availability, the 'A' in the CIA triad. Volumetric attacks saturate the network link; protocol attacks (SYN floods) exhaust connection tables; application-layer attacks send requests that look legitimate but are expensive to serve. The attack in this dataset is an HTTP flood from LOIC aimed at a web server on port 80, which is the application-layer style that most directly threatens a website.",
      },
    ],
  },
  {
    id: "dataset",
    title: "3. Dataset",
    blocks: [
      {
        type: "kv",
        items: [
          { label: "Name", value: ddos.dataset.name },
          { label: "Publisher", value: ddos.dataset.publisher },
          { label: "File", value: ddos.dataset.file },
          { label: "Source (Hugging Face)", value: ddos.dataset.links.huggingface },
          { label: "Also on Kaggle", value: ddos.dataset.links.kaggle },
          { label: "Original", value: ddos.dataset.links.original },
          { label: "Capture", value: ddos.dataset.capture },
          { label: "Records", value: `${num(p.raw_rows)} network flows × ${p.raw_columns} columns (78 CICFlowMeter features + Label)` },
          { label: "Labels", value: `BENIGN (normal) and DDoS (attack): ${num(benign)} vs ${num(attack)} after cleaning` },
        ],
      },
      {
        type: "p",
        text: "Each row is one bidirectional network flow (a conversation between two endpoints) summarised by CICFlowMeter into statistics such as duration, packet counts, bytes, packet sizes, inter-arrival times (IAT), and TCP flag counts. CIC-IDS2017 is widely used in intrusion-detection research because it mixes realistic background traffic with labelled attacks generated in a controlled lab, so no real website was attacked to produce it.",
      },
    ],
  },
  {
    id: "methods",
    title: "4. Preprocessing and analysis methods",
    blocks: [
      {
        type: "list",
        ordered: true,
        items: [
          "Stripped whitespace from column names and labels and removed the duplicated 'Fwd Header Length' column.",
          `Converted every feature to numeric and dropped ${num(p.dropped_nan_inf)} rows containing NaN or infinite values (division by zero in rate features for zero-duration flows).`,
          `Removed ${num(p.dropped_duplicates)} exact duplicate flows, leaving ${num(p.clean_rows)} rows.`,
          `Selected ${ddos.preprocessing.features_used.length} interpretable flow features (volume, size, timing, flags, TCP window). Destination Port was analysed but excluded from the models because every attack flow targets port 80; a model given the port could 'detect' the attack by memorising it.`,
          "Applied log(1 + x) to all features because flow statistics span many orders of magnitude.",
          `Drew a stratified sample of ${num(p.sample_rows)} flows and split it 80/20 into ${num(p.train_rows)} training and ${num(p.test_rows)} test rows, preserving the class ratio.`,
          "Statistical analysis: per-class medians, means, and 90th percentiles; log-scale histograms; destination-port shares; correlation of each feature with the attack label.",
          "Detection methods, all scored on the same held-out test set: (a) a volume threshold at the 99th percentile of benign packets/s, (b) the single best feature cutoff learned from training data, (c) an Isolation Forest anomaly detector trained only on benign flows, (d) Logistic Regression, (e) Random Forest (100 trees).",
          "Tools: Python, Pandas, NumPy, scikit-learn. The script is backend/ml/ddos.py in this repository and regenerates every number on this page.",
        ],
      },
    ],
  },
  {
    id: "findings",
    title: "5. What the traffic shows",
    blocks: [
      {
        type: "table",
        caption: "Per-flow traffic volume by class (all cleaned flows). Medians resist the extreme outliers that dominate the means.",
        head: ["Feature", "Unit", "Benign median", "DDoS median", "Benign p90", "DDoS p90"],
        rows: ddos.volume.map((v) => [
          v.feature,
          v.unit,
          num(v.benign_median),
          num(v.attack_median),
          num(v.benign_p90),
          num(v.attack_p90),
        ]),
      },
      {
        type: "list",
        items: [
          `Normal traffic is diverse: ${pct(ddos.ports.benign[0].share)} of benign flows are DNS (port ${ddos.ports.benign[0].port}), followed by HTTPS and HTTP. Rates vary widely; the median benign flow sends ${pps.benign_median} packets/s, but the top 10% exceed ${num(Math.round(pps.benign_p90))} packets/s (very short flows, where a few packets within microseconds produce a huge rate).`,
          `Attack traffic is uniform: ${pct(ddos.ports.attack[0].share)} of DDoS flows target port ${ddos.ports.attack[0].port}. Each flow is small and slow (median ${pps.attack_median} packets/s, ${fwdBytes.attack_median} forward bytes vs ${fwdBytes.benign_median} for benign) but packets are large on average (median packet length ${pktMean.attack_median} vs ${pktMean.benign_median} bytes) because the server answers each flood request with a full HTTP response.`,
          `Traffic volume: the attack's volume comes from the number of flows (${num(attack)} attack flows in a roughly 20-minute window), not from the size of any single flow. Per-flow volume is actually lower for attack traffic than for normal traffic.`,
          `Attack patterns: the features most correlated with the attack label are ${ddos.correlations
            .slice(0, 3)
            .map((c) => c.feature)
            .join(", ")}. Random Forest relied most on ${ddos.importances
            .slice(0, 3)
            .map((c) => c.feature)
            .join(", ")}: the repetitive, near-identical request shape of a flood tool.`,
          "Abnormal behaviour is therefore best identified by shape and repetition (identical small requests, one destination, uniform timing) rather than by raw speed per connection.",
        ],
      },
    ],
  },
  {
    id: "results",
    title: "6. Experimental results",
    blocks: [
      {
        type: "table",
        caption: `Held-out test set: ${num(p.test_rows)} flows. Attack is the positive class.`,
        head: ["Method", "Family", "Precision", "Recall", "F1", "Accuracy"],
        rows: [...ddos.detectors, ...ddos.models].map((d) => [d.name, d.family, pct(d.precision, 2), pct(d.recall, 2), pct(d.f1, 2), pct(d.accuracy, 2)]),
        highlightRow: ddos.detectors.length + ddos.models.findIndex((m) => m.name === "Random Forest"),
      },
      {
        type: "list",
        items: [
          `Volume threshold (F1 ${pct(volumeRule.f1, 2)}): almost useless here. Flagging flows faster than the benign 99th percentile caught ${volumeRule.cm.tp} of ${num(volumeRule.cm.tp + volumeRule.cm.fn)} attack flows, because individual flood flows are slow. 'More traffic = attack' only works when you aggregate per destination over time.`,
          `Single-feature rule (${stump.rule}): recall ${pct(stump.recall, 2)} but precision ${pct(stump.precision, 2)}. It catches every attack flow but would block ${num(stump.cm.fp)} legitimate flows in the test set alone, which itself harms availability.`,
          `Isolation Forest: precision ${pct(iso.precision, 2)}, recall ${pct(iso.recall, 2)}. Without labels it finds some attack flows, but flood flows are individually ordinary, so most look 'normal' to an anomaly detector.`,
          `Logistic Regression: F1 ${pct(lr.f1, 2)} with ${lr.cm.fp} false alarms and ${lr.cm.fn} missed attacks.`,
          `Random Forest: F1 ${pct(rf.f1, 2)}, precision ${pct(rf.precision, 2)}, recall ${pct(rf.recall, 2)}, ROC-AUC ${pct(rf.roc_auc ?? 0, 2)}. It missed ${rf.cm.fn} of ${num(rf.cm.tp + rf.cm.fn)} attack flows and raised ${rf.cm.fp} false alarms.`,
        ],
      },
      {
        type: "callout",
        title: "What this means for detection",
        text: `A false negative is attack traffic that reaches the server; a false positive is a real visitor who gets blocked. Random Forest keeps both near zero (${rf.cm.fn} and ${rf.cm.fp}), which is what a mitigation layer needs: it can drop flood traffic while legitimate users keep getting served.`,
      },
    ],
  },
  {
    id: "conclusion",
    title: "7. Conclusions, limitations, and future work",
    blocks: [
      {
        type: "callout",
        title: "Answer to the research question",
        text: `Yes. Supervised ML separated DDoS from normal flows almost perfectly (Random Forest F1 ${pct(rf.f1, 2)}), while a naive volume threshold failed (F1 ${pct(volumeRule.f1, 2)}). The useful signal is the shape and repetition of attack flows, not their per-flow speed.`,
      },
      {
        type: "p",
        text: "For website availability, this means detection should combine flow-level classification (to drop individual flood connections) with aggregate rate monitoring (to notice that a single endpoint is suddenly receiving tens of thousands of flows). Either alone is weaker than both together.",
      },
      {
        type: "list",
        items: [
          "Limitation: one capture, one attack tool (LOIC), one victim. Near-perfect scores reflect how uniform that attack is and will not transfer directly to other botnets or real networks.",
          "Limitation: flows are classified independently; there is no time-window feature such as flows per second per destination, which is how operators usually spot a surge.",
          "Limitation: CIC-IDS2017 has known labelling and flow-construction artefacts reported in later research.",
          "Limitation: lab-generated attacks; no encrypted (HTTPS) floods or low-and-slow attacks like Slowloris in this file.",
          "Future work: test on other days (Wednesday DoS: Hulk, GoldenEye, Slowloris) and on CIC-DDoS2019 to check generalisation.",
          "Future work: add windowed aggregate features and evaluate with a time-based split rather than a random split.",
          "Future work: deploy the model behind rate limiting / a WAF and measure latency and false-block rate on live traffic in an authorised test environment.",
        ],
      },
      {
        type: "p",
        text: "Ethics: all analysis used a public, labelled dataset. No traffic was sent to any real website or network.",
      },
    ],
  },
];
