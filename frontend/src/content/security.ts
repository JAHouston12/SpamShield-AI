export const ATTACKS = [
  {
    id: "campaigns",
    title: "Spam campaigns",
    severity: "Medium",
    body: "High-volume, templated broadcasts: premium-rate competitions, ringtone subscriptions, dating and adult content. They dominate the dataset and repeat with minor variations.",
    indicators: ["Short codes and premium numbers (0906…, 87121)", "“Txt STOP to opt out” footers", "Near-duplicate templates sent at scale"],
    examples: ["FREE entry into our £250 weekly comp just text WIN to 80086 NOW", "Get the latest ringtones! Txt TONE to 87131"],
  },
  {
    id: "phishing",
    title: "Phishing (smishing)",
    severity: "High",
    body: "Messages that impersonate a trusted brand or contact to steal credentials, payment data, or one-time codes, typically through a link or call-back number.",
    indicators: ["Account, verify, suspended, locked", "Brand impersonation (bank, carrier, courier)", "Urgency and deadline pressure"],
    examples: ["Your account has been suspended. Verify now at secure-bank-login.co", "URGENT! Your mobile number has been awarded £2000. Call 09061701461"],
  },
  {
    id: "malicious",
    title: "Malicious messaging content",
    severity: "Critical",
    body: "Payload-delivery messages: links to malware (banking trojans, spyware APKs), fake app updates, or premium-rate dialers that bill the victim directly.",
    indicators: ["Shortened or look-alike URLs", "Prompts to install or update an app", "Unexpected delivery or invoice notices"],
    examples: ["Your parcel is waiting. Track here: dhl-parcel.top/x8k2", "Voicemail received. Listen: vm-play.app/3fa"],
  },
];

export const DIFFICULT_MESSAGES = [
  {
    title: "Conversational spam",
    body: "Messages written like a friend (“Hey babe, been a while…”) avoid the transactional vocabulary the model has learned to associate with spam.",
  },
  {
    title: "Concept drift",
    body: "The corpus dates from 2011. Modern smishing (shortened links, courier and bank lures) uses patterns the models rarely saw, so the live detector adds a threat-signal layer.",
  },
  {
    title: "Legitimate marketing",
    body: "Opt-in promotions from real businesses share vocabulary with spam (free, offer, call now) and are a common source of false positives.",
  },
  {
    title: "Obfuscation",
    body: "Character substitution (FR33, c@ll), extra spacing, and Unicode homoglyphs split tokens so TF-IDF features never fire.",
  },
  {
    title: "Very short messages",
    body: "One-line lures (“Call me back on 07…”) carry few features, so models fall back on length and digit counts alone.",
  },
  {
    title: "Label noise",
    body: "Some ham-labeled messages look like spam and vice versa. A portion of the measured errors reflects annotation ambiguity rather than model failure.",
  },
];

export const OPERATIONS = [
  { title: "Latency budget", body: "Inference must finish in a few milliseconds per message at carrier scale. Linear models and compact forests meet this comfortably; KNN does not." },
  { title: "Threshold policy", body: "Map spam probability to actions (deliver, tag, quarantine, block) instead of one hard cut-off, and tune each band to the organization's risk appetite." },
  { title: "Monitoring & drift", body: "Track score distributions, block rates, and user reports daily. A shift signals new campaigns or model decay and triggers retraining." },
  { title: "Feedback loop", body: "“Report spam” and “not spam” actions become fresh labels. Retrain on a schedule with human review of disputed samples." },
  { title: "Adversarial pressure", body: "Attackers probe filters. Rate-limit scoring APIs, avoid exposing raw scores to senders, and red-team with obfuscated variants." },
  { title: "Privacy & compliance", body: "Message content is personal data. Process in-region, minimize retention, log decisions rather than bodies, and document the model for audits." },
];

export const FALSE_POSITIVES = {
  consequences: [
    "Legitimate messages such as one-time passcodes, delivery updates, or a family emergency are silently quarantined.",
    "Users stop trusting the filter, disable it, or habitually check the spam folder, which defeats the control.",
  ],
  business: [
    "Lost revenue when transactional or marketing messages from legitimate senders are blocked.",
    "Support costs from complaints and appeals; regulatory exposure for carriers that block lawful traffic.",
  ],
  communication: [
    "Time-critical information (2FA codes, appointment reminders, safety alerts) arrives late or never.",
    "Senders are damaged reputationally when their numbers are wrongly flagged.",
  ],
};

export const FALSE_NEGATIVES = {
  risks: [
    "Each missed spam message is a live attack delivered straight to the user's primary device.",
    "Users trust SMS more than email, so click-through rates on smishing are markedly higher.",
  ],
  phishing: [
    "Credential theft leads to account takeover, SIM-swap fraud, and lateral movement into corporate systems.",
    "One-time-code interception defeats SMS-based multi-factor authentication.",
  ],
  malware: [
    "Links deliver banking trojans and spyware that harvest contacts and spread the campaign further.",
    "Premium-rate traps generate direct financial loss for the victim.",
  ],
};

export const DEPLOYMENT_FLOW = [
  { id: "ingest", title: "SMS gateway / MTA", body: "Messages arrive from the carrier SMSC or an A2P aggregator." },
  { id: "enrich", title: "Feature service", body: "Text cleaning, TF-IDF, engineered and sender-reputation features." },
  { id: "score", title: "Model service (FastAPI)", body: "Ensemble scoring plus threat-signal heuristics, under 10 ms per message." },
  { id: "policy", title: "Policy engine", body: "Probability bands map to deliver, tag, quarantine, or block actions." },
  { id: "soc", title: "SOC & SIEM", body: "High-risk verdicts stream to the SIEM with explanations for analyst triage." },
  { id: "feedback", title: "Feedback & retraining", body: "User reports and analyst labels feed scheduled retraining and drift checks." },
];

export const POLICY_BANDS = [
  { range: "< 0.30", action: "Deliver", tone: "ham", detail: "No user friction." },
  { range: "0.30 – threshold", action: "Deliver + warn", tone: "warning", detail: "Banner: “Be careful with links in this message.”" },
  { range: "threshold – 0.90", action: "Quarantine", tone: "spam", detail: "Held in a spam folder; user can release it." },
  { range: "≥ 0.90", action: "Block & alert", tone: "spam", detail: "Dropped at the gateway and logged to the SIEM." },
];
