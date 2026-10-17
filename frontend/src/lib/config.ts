/**
 * Backend origin used by server components and by the local Next.js rewrite proxy.
 * On Vercel the backend is a sibling service on the same domain (see vercel.json), so server fetches
 * target the deployment itself. Protected preview URLs reject these fetches, and pages then fall back
 * to the bundled snapshot.
 */
function vercelOrigin(): string | undefined {
  const host =
    process.env.VERCEL_ENV === "production" ? process.env.VERCEL_PROJECT_PRODUCTION_URL : process.env.VERCEL_URL;
  return host ? `https://${host}` : undefined;
}

export const API_ORIGIN =
  process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? vercelOrigin() ?? "http://127.0.0.1:8417";

/** Browser requests stay same-origin: proxied by next.config.mjs locally, routed by vercel.json on Vercel. */
export const CLIENT_API_BASE = "/api/v1";
export const SERVER_API_BASE = `${API_ORIGIN}/api/v1`;
export const API_DOCS_PATH = "/api/v1/docs";

export const SITE = {
  name: "SpamShield AI",
  tagline: "Machine learning defense against SMS spam and phishing",
  kaggleUrl: "https://www.kaggle.com/datasets/uciml/sms-spam-collection-dataset",
  uciUrl: "https://archive.ics.uci.edu/dataset/228/sms+spam+collection",
  repoUrl: "#",
} as const;
