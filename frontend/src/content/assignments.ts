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
}

export const ASSIGNMENTS: Assignment[] = [
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
];

export const getAssignment = (slug: string) => ASSIGNMENTS.find((a) => a.slug === slug);

export const sortedAssignments = () => [...ASSIGNMENTS].sort((a, b) => b.number - a.number);
