/**
 * Course assignments. To add one: drop the PDF in `frontend/public/assignments/` and append an entry
 * below. The index page, detail page, and static routes are generated from this list.
 */
export interface Assignment {
  slug: string;
  number: number;
  title: string;
  subtitle: string;
  /** ISO date (YYYY-MM-DD); optional because older work may not have a recorded date. */
  submitted?: string;
  status: "submitted" | "in-progress" | "planned";
  summary: string;
  /** Path under `public/`, served as a static file. */
  pdf?: string;
  pages?: number;
  topics: string[];
  highlights: { label: string; value: string }[];
  /** Related pages in this site that implement or extend the assignment. */
  related: { href: string; label: string }[];
  /** Renders a rich in-page write-up instead of a PDF. Keys map to components in the detail page. */
  body?: "ddos";
  /** Embedded movie: a file under `public/` (`src`) or an unlisted YouTube video (`youtubeId`). */
  video?: { title: string; src?: string; poster?: string; youtubeId?: string; caption?: string };
}

export const ASSIGNMENTS: Assignment[] = [
  {
    slug: "assignment-7",
    number: 7,
    title: "Assignment 7",
    subtitle: "DoS/DDoS Attacks, Website Availability, and AI Movie Creation",
    status: "submitted",
    submitted: "2026-10-25",
    summary:
      "Data-driven DDoS detection on the public CIC-IDS2017 Friday DDoS capture: normal vs attack traffic analysis, a volume threshold, a single-feature rule, Isolation Forest anomaly detection, and Logistic Regression vs Random Forest, plus an AI-generated movie about restoring website availability.",
    topics: ["DoS vs DDoS", "Website availability", "CIC-IDS2017", "Anomaly detection", "Random Forest", "Google Flow"],
    highlights: [
      { label: "Research question", value: "Can data-driven methods detect the abnormal network traffic of a DDoS attack?" },
      { label: "Dataset", value: "CIC-IDS2017, Friday DDoS (225,745 flows, Hugging Face / Kaggle)" },
      { label: "Methods", value: "Volume threshold, single-feature rule, Isolation Forest, Logistic Regression, Random Forest" },
      { label: "Metrics", value: "Precision, Recall, F1-Score, Confusion matrix, ROC-AUC" },
    ],
    related: [
      { href: "/security", label: "Threat model and attacks" },
      { href: "/evaluation", label: "Same metrics on the spam models" },
    ],
    body: "ddos",
    video: {
      title: "Restoring availability: an AI movie about DDoS detection",
      src: "/videos/assignment-7.mp4",
      poster: "/videos/assignment-7-poster.jpg",
      caption: "Generated with Google Flow: four 8-second scenes edited into one 30-second movie",
    },
  },
  {
    slug: "assignment-6",
    number: 6,
    title: "Assignment 6",
    subtitle: "XSS Security and AI Research Method",
    status: "submitted",
    summary:
      "Research method for spam detection using machine learning: problem statement, method selection, a Logistic Regression baseline, a Random Forest improvement with TF-IDF features, experimental design, expected results, limitations, and the plan for a web-based detector.",
    pdf: "/assignments/assignment-6.pdf",
    pages: 7,
    topics: ["Spam detection", "Research method", "Random Forest", "Logistic Regression", "TF-IDF"],
    highlights: [
      { label: "Research question", value: "Can machine learning improve spam detection accuracy compared to a basic baseline model?" },
      { label: "Dataset", value: "SMS Spam Collection (5,574 messages, Kaggle)" },
      { label: "Baseline", value: "Logistic Regression" },
      { label: "Proposed model", value: "Random Forest with TF-IDF" },
      { label: "Metrics", value: "Accuracy, Precision, Recall, F1-Score" },
      { label: "Planned split", value: "70% train · 15% validation · 15% test" },
    ],
    related: [
      { href: "/evaluation", label: "Measured results" },
      { href: "/models", label: "All ten models" },
      { href: "/detector", label: "Live detector (website implementation)" },
      { href: "/report?tab=report", label: "Final report" },
    ],
  },
  {
    slug: "lab-1",
    number: 1,
    title: "Lab 1",
    subtitle: "Identity and Security: Windows IP Configuration, ping, tracert, and ARP",
    status: "submitted",
    submitted: "2026-10-29",
    summary:
      "Laboratory report for CPS 3498 exploring a Windows client's network identity: reading the IP configuration with ipconfig, testing reachability and latency with ping, mapping routes to kean.edu and google.com with tracert, and inspecting IP-to-MAC mappings in the ARP cache.",
    pdf: "/assignments/lab-1.pdf",
    pages: 5,
    topics: ["ipconfig", "DHCP", "Subnet masks", "ping / TTL", "tracert", "ARP"],
    highlights: [
      { label: "Course", value: "CPS 3498 · Dr. Bin Hu" },
      { label: "Lab 1.1", value: "Windows client IP configuration (ipconfig /all, /renew, /release)" },
      { label: "Lab 1.2 A", value: "ping the gateway (avg 2 ms, TTL 64) and tracert to kean.edu and google.com (8 hops)" },
      { label: "Lab 1.2 B", value: "ARP cache inspection with arp -a" },
    ],
    related: [{ href: "/security", label: "Threat model and attacks" }],
  },
];

export const getAssignment = (slug: string) => ASSIGNMENTS.find((a) => a.slug === slug);

export const sortedAssignments = () => [...ASSIGNMENTS].sort((a, b) => b.number - a.number);
