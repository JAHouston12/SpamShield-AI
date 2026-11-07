import { readFileSync } from "node:fs";
import { KnowledgeIndex } from "../src/lib/assistant/retrieval.ts";

const kb = JSON.parse(readFileSync(new URL("../src/data/generated/knowledge.json", import.meta.url), "utf8"));
const index = new KnowledgeIndex(kb);
const cases: [string, string | null][] = [
  ["What is phishing, and how can I recognize a phishing email?", "phishing"],
  ["How can I create a strong password?", "password"],
  ["What is a denial-of-service (DoS) attack?", "dos"],
  ["What is the difference between DoS and DDoS attacks?", "dos-vs-ddos"],
  ["How can I protect my computer from malware?", "malware"],
  ["What is SQL injection?", "sqli"],
  ["How does multi-factor authentication work?", "mfa"],
  ["What should I do if I suspect my computer has been hacked?", "hacked"],
  ["How can I protect my personal information online?", "privacy"],
  ["How can I identify a suspicious website?", "suspicious-site"],
  ["teach me how to recognize phishing attacks", "phishing"],
  ["what was assignment 7 about", "assignment-7"],
  ["what is the threat level", "monitor"],
  ["what did lab 1 cover", "lab-1"],
  ["how accurate is the spam model", "spamshield"],
  ["how do the assignments relate", "assignments-overview"],
  ["what is xss", "xss"],
  ["what is the capital of france", null],
];
let fail = 0;
for (const [q, want] of cases) {
  const got = index.answer(q, []).topic;
  if (got !== want) { fail++; console.log("FAIL", q, "want", want, "got", got); }
}
const follow = index.answer("tell me more", [{ role: "user", content: "What is SQL injection?" }, { role: "assistant", content: "..." }]);
if (follow.topic !== "sqli" || !follow.answer.includes("Security Monitor")) { fail++; console.log("FAIL follow-up", follow.topic); }
console.log(`${cases.length + 1 - fail}/${cases.length + 1} retrieval cases passed`);
if (fail) process.exit(1);
