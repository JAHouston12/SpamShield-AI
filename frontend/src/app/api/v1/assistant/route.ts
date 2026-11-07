import { NextResponse } from "next/server";

import knowledge from "@/data/generated/knowledge.json";
import { KnowledgeIndex, type KnowledgeFile, type Turn } from "@/lib/assistant/retrieval";

/**
 * Same contract as the FastAPI POST /api/v1/assistant. Served by Next.js so the assistant works when only the
 * front end is deployed; when the Python service is routed at /api/*, it answers instead.
 */

const index = new KnowledgeIndex(knowledge as KnowledgeFile);
const hits = new Map<string, number[]>();
const LIMIT = 20;
const WINDOW_MS = 60_000;

const SYSTEM_PROMPT =
  "You are Shield, the security assistant on the SpamShield AI course website. Answer computer-security questions clearly for a non-expert in under 170 words, with practical advice. Use the provided context about this website's assignments when relevant and do not invent assignment details that are not in the context. If the question is not about security or this website, briefly say what you can help with. Plain text only, no markdown headings.";

function allow(client: string) {
  const now = Date.now();
  const recent = (hits.get(client) ?? []).filter((t) => now - t < WINDOW_MS);
  if (recent.length >= LIMIT) return false;
  recent.push(now);
  hits.set(client, recent);
  return true;
}

async function gemini(question: string, history: Turn[], key: string): Promise<string | null> {
  const model = process.env.GEMINI_MODEL ?? "gemini-2.5-flash";
  const contents = [
    ...history.slice(-6).map((h) => ({ role: h.role === "assistant" ? "model" : "user", parts: [{ text: h.content }] })),
    { role: "user", parts: [{ text: `Context:\n${index.context(question, history)}\n\nQuestion: ${question}` }] },
  ];
  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": key },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
        contents,
        generationConfig: { temperature: 0.3, maxOutputTokens: 400 },
      }),
      signal: AbortSignal.timeout(12_000),
    });
    if (!res.ok) throw new Error(`Gemini ${res.status}`);
    const data = await res.json();
    const text = (data.candidates?.[0]?.content?.parts ?? []).map((p: { text?: string }) => p.text ?? "").join("").trim();
    return text || null;
  } catch (err) {
    console.warn("Gemini request failed, using local answer:", err);
    return null;
  }
}

function parse(body: unknown): { question: string; history: Turn[] } | string {
  if (typeof body !== "object" || body === null) return "Invalid JSON body";
  const { question, history = [] } = body as { question?: unknown; history?: unknown };
  if (typeof question !== "string" || !question.trim()) return "question is required";
  if (question.length > 500) return "question must be at most 500 characters";
  if (!Array.isArray(history) || history.length > 12) return "history must be a list of at most 12 turns";
  const turns: Turn[] = [];
  for (const t of history) {
    if (!t || (t.role !== "user" && t.role !== "assistant") || typeof t.content !== "string" || t.content.length > 2000) {
      return "invalid history turn";
    }
    turns.push({ role: t.role, content: t.content });
  }
  return { question: question.trim(), history: turns.slice(-6) };
}

export async function POST(req: Request) {
  const client = (req.headers.get("x-forwarded-for") ?? "anon").split(",")[0].trim();
  if (!allow(client)) return NextResponse.json({ detail: "Too many questions; please wait a minute." }, { status: 429 });

  const parsed = parse(await req.json().catch(() => null));
  if (typeof parsed === "string") return NextResponse.json({ detail: parsed }, { status: 422 });

  const local = index.answer(parsed.question, parsed.history);
  const key = process.env.GEMINI_API_KEY;
  if (key) {
    const text = await gemini(parsed.question, parsed.history, key);
    if (text) return NextResponse.json({ ...local, answer: text, mode: "gemini" });
  }
  return NextResponse.json({ ...local, mode: "local" });
}
