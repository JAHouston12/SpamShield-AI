/** Backend origin used by server components and by the Next.js rewrite proxy. */
export const API_ORIGIN = process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8417";

/** Browser requests go through the same-origin rewrite in next.config.mjs, avoiding CORS. */
export const CLIENT_API_BASE = "/api/v1";
export const SERVER_API_BASE = `${API_ORIGIN}/api/v1`;

export const SITE = {
  name: "SpamShield AI",
  tagline: "Machine learning defense against SMS spam and phishing",
  kaggleUrl: "https://www.kaggle.com/datasets/uciml/sms-spam-collection-dataset",
  uciUrl: "https://archive.ics.uci.edu/dataset/228/sms+spam+collection",
  repoUrl: "#",
} as const;
