/**
 * TF-IDF retrieval over the exported knowledge base, mirroring the backend's scikit-learn setup
 * (word unigrams + bigrams, English stop words, sublinear tf, smoothed idf, L2 norm, cosine similarity).
 */

export interface KbEntry {
  id: string;
  title: string;
  tags: string;
  answer: string;
  more: string;
  link: string;
}

export interface KnowledgeFile {
  stop_words: string[];
  entries: KbEntry[];
}

export interface Turn {
  role: "user" | "assistant";
  content: string;
}

export interface LocalAnswer {
  answer: string;
  sources: { title: string; link: string }[];
  topic: string | null;
}

const MIN_SCORE = 0.08;
export const FOLLOW_UP_RE =
  /^(tell me more|more|go on|continue|explain (that|it|more)|why\??|how\??|what else|example|can you elaborate|elaborate|and\??|more details?|what do you mean|how does (that|it) work\??|what about .{0,30})[.!?]*$/i;

const FALLBACK =
  "I'm not sure about that one. I can explain security topics like phishing, strong passwords, DoS and DDoS, malware, SQL injection, XSS, MFA, or what to do if you've been hacked, answer questions about this site's assignments, or control the site (try 'switch to dark mode' or 'play the training video').";

type Vec = Map<number, number>;

export class KnowledgeIndex {
  private vocab = new Map<string, number>();
  private idf: number[] = [];
  private docs: Vec[];
  private stop: Set<string>;
  private kb: KnowledgeFile;

  constructor(kb: KnowledgeFile) {
    this.kb = kb;
    this.stop = new Set(kb.stop_words);
    const texts = kb.entries.map((e) => `${e.title} ${e.title} ${e.tags} ${e.tags} ${e.answer}`);
    const termLists = texts.map((t) => this.terms(t));
    const df = new Map<string, number>();
    termLists.forEach((terms) => Array.from(new Set(terms)).forEach((t) => df.set(t, (df.get(t) ?? 0) + 1)));
    Array.from(df.keys())
      .sort()
      .forEach((t, i) => this.vocab.set(t, i));
    const n = texts.length;
    this.vocab.forEach((i, t) => (this.idf[i] = Math.log((1 + n) / (1 + df.get(t)!)) + 1));
    this.docs = termLists.map((terms) => this.vectorize(terms));
  }

  private terms(text: string): string[] {
    const tokens = (text.toLowerCase().match(/\b\w\w+\b/g) ?? []).filter((t) => !this.stop.has(t));
    const out = [...tokens];
    for (let i = 0; i < tokens.length - 1; i++) out.push(`${tokens[i]} ${tokens[i + 1]}`);
    return out;
  }

  private vectorize(terms: string[]): Vec {
    const tf = new Map<number, number>();
    for (const t of terms) {
      const i = this.vocab.get(t);
      if (i !== undefined) tf.set(i, (tf.get(i) ?? 0) + 1);
    }
    const v: Vec = new Map();
    let norm = 0;
    tf.forEach((c, i) => {
      const w = (1 + Math.log(c)) * this.idf[i];
      v.set(i, w);
      norm += w * w;
    });
    norm = Math.sqrt(norm) || 1;
    v.forEach((w, i) => v.set(i, w / norm));
    return v;
  }

  search(query: string, k = 3): { entry: KbEntry; score: number }[] {
    const q = this.vectorize(this.terms(query));
    return this.docs
      .map((d, idx) => {
        let s = 0;
        q.forEach((w, i) => (s += w * (d.get(i) ?? 0)));
        return { entry: this.kb.entries[idx], score: s };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, k);
  }

  answer(question: string, history: Turn[]): LocalAnswer {
    const lastUser = [...history].reverse().find((h) => h.role === "user")?.content ?? "";
    const followUp = FOLLOW_UP_RE.test(question.trim()) && history.length > 0;
    const hits = this.search(followUp ? `${lastUser} ${question}` : question);
    const top = hits[0];
    if (!top || top.score < MIN_SCORE) return { answer: FALLBACK, sources: [], topic: null };
    let answer = followUp && top.entry.more ? top.entry.more : top.entry.answer;
    if (!followUp && top.entry.more) answer += " Ask 'tell me more' for details.";
    return {
      answer,
      sources: hits.filter((h) => h.score >= MIN_SCORE).map((h) => ({ title: h.entry.title, link: h.entry.link })),
      topic: top.entry.id,
    };
  }

  /** Context passages for grounding a generative model. */
  context(question: string, history: Turn[]): string {
    const lastUser = [...history].reverse().find((h) => h.role === "user")?.content ?? "";
    return this.search(`${lastUser} ${question}`, 4)
      .filter((h) => h.score > 0.02)
      .map((h) => `[${h.entry.title}]\n${h.entry.answer}\n${h.entry.more}`)
      .join("\n\n");
  }
}
