import {
  BarChart3,
  BookOpen,
  BrainCircuit,
  Database,
  FileText,
  Gauge,
  Home,
  type LucideIcon,
  Radar,
  ScanSearch,
  ShieldAlert,
  SlidersHorizontal,
} from "lucide-react";

export type NavGroup = "Overview" | "Research" | "Security" | "Tools";

export interface NavItem {
  href: string;
  title: string;
  short: string;
  description: string;
  icon: LucideIcon;
  group: NavGroup;
}

export const NAV_ITEMS: NavItem[] = [
  {
    href: "/",
    title: "Home",
    short: "Home",
    description: "Project overview, research question, and objectives.",
    icon: Home,
    group: "Overview",
  },
  {
    href: "/dataset",
    title: "Dataset",
    short: "Dataset",
    description: "SMS Spam Collection documentation, features, and samples.",
    icon: Database,
    group: "Research",
  },
  {
    href: "/eda",
    title: "Exploratory Data Analysis",
    short: "EDA",
    description: "Distributions, missing values, duplicates, and correlations.",
    icon: BarChart3,
    group: "Research",
  },
  {
    href: "/preprocessing",
    title: "Data Preprocessing",
    short: "Preprocessing",
    description: "Cleaning, TF-IDF, class imbalance, and train/test split.",
    icon: SlidersHorizontal,
    group: "Research",
  },
  {
    href: "/models",
    title: "Machine Learning Models",
    short: "Models",
    description: "Ten classifiers from baseline to gradient boosting and MLP.",
    icon: BrainCircuit,
    group: "Research",
  },
  {
    href: "/evaluation",
    title: "Model Evaluation",
    short: "Evaluation",
    description: "Accuracy, precision, recall, F1, ROC-AUC, and rankings.",
    icon: Gauge,
    group: "Research",
  },
  {
    href: "/security",
    title: "Security Analysis",
    short: "Security",
    description: "Threats detected, error costs, and real-world deployment.",
    icon: ShieldAlert,
    group: "Security",
  },
  {
    href: "/explainability",
    title: "Explainable AI",
    short: "Explainable AI",
    description: "Feature importance, model reasoning, and SHAP panels.",
    icon: Radar,
    group: "Security",
  },
  {
    href: "/detector",
    title: "Live Detector",
    short: "Live Detector",
    description: "Classify any message in real time with confidence scores.",
    icon: ScanSearch,
    group: "Tools",
  },
  {
    href: "/docs",
    title: "Documentation",
    short: "Docs",
    description: "Installation, API usage, and future improvements.",
    icon: BookOpen,
    group: "Tools",
  },
  {
    href: "/report",
    title: "Report & Presentation",
    short: "Report",
    description: "Proposal, final report, and presentation outline.",
    icon: FileText,
    group: "Tools",
  },
];

export const NAV_GROUPS: NavGroup[] = ["Overview", "Research", "Security", "Tools"];

export function getNavItem(href: string): NavItem | undefined {
  return NAV_ITEMS.find((item) => item.href === href);
}
