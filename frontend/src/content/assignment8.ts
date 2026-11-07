import seclog from "@/data/generated/seclog.json";
import type { DocSection } from "@/content/report";
import { num } from "@/lib/format";

const t = seclog.totals;

export const A8_SECTIONS: DocSection[] = [
  {
    id: "description",
    title: "1. Project description",
    blocks: [
      {
        type: "p",
        text: "Assignment 8 turns SpamShield AI into a website you can talk to. It has two parts: a security monitoring dashboard that analyses a week of web and login logs for intrusions, and Shield, an AI assistant available on every page. Shield changes the site's appearance, plays music and the training video, and navigates pages when you type or speak a request. It also answers computer-security questions using this project's own content.",
      },
      {
        type: "kv",
        items: [
          { label: "Assistant", value: "Shield: chatbot plus a simple digital human (animated avatar that blinks, listens, and lip-syncs while it speaks)" },
          { label: "Input", value: "Typed text, or voice through the browser's speech recognition (Chrome and Edge)" },
          { label: "Output", value: "Website actions, written replies, and spoken replies (text-to-speech)" },
          { label: "Monitoring", value: `Security Monitor page: ${num(t.events)} log events, ${t.detected_attacks} detected attacks, threat level ${seclog.threat.level}` },
        ],
      },
    ],
  },
  {
    id: "commands",
    title: "2. What you can say",
    blocks: [
      {
        type: "table",
        textOnly: true,
        head: ["Feature", "Example commands"],
        rows: [
          ["Background color", "\"Change the background to blue\", \"Make the background light blue\""],
          ["Background image", "\"Set the background to a computer security image\""],
          ["Theme", "\"Switch to dark mode\", \"Switch to light mode\""],
          ["Text size", "\"Make the text larger\", \"Make the font smaller\", \"Normal text size\""],
          ["Music", "\"Play music\", \"Change the music\", \"Pause the music\""],
          ["Video", "\"Play the cybersecurity training video\", \"Close the video\""],
          ["Navigation", "\"Open the security dashboard\", \"Go to assignment 7\", \"Open the cybersecurity learning section\""],
          ["Scrolling", "\"Scroll down\", \"Scroll to the top\""],
          ["Reset", "\"Restore the original appearance\""],
          ["Security Q&A", "\"How can I recognize a phishing email?\", \"What is SQL injection?\", \"Tell me more\""],
          ["Combined", "\"Hello! Change the background to dark blue, play the cybersecurity training video, and teach me how to recognize phishing attacks\""],
        ],
      },
    ],
  },
  {
    id: "implementation",
    title: "3. Implementation summary",
    blocks: [
      {
        type: "list",
        items: [
          "Front end: Next.js (React, TypeScript) with Tailwind CSS. The assistant is a client component mounted in the root layout, so it stays open while you move between pages.",
          "Command understanding: a rule-based natural-language parser splits a request into clauses (on commas, 'and then', and 'and' followed by a verb) and maps each clause to one whitelisted action. Anything that isn't an action is treated as a question.",
          "Website control: a React context applies actions with CSS variables and classes on the page (theme palette, background color or image, root font size), the Next.js router (navigation), and the Web Audio API (three synthesised ambient music tracks, so no audio files). Appearance is saved in localStorage.",
          "Voice: the Web Speech API's SpeechRecognition for input and speechSynthesis for spoken replies. The avatar's mouth animates while it speaks.",
          "Security Q&A: a FastAPI endpoint (POST /api/v1/assistant) searches a curated knowledge base with TF-IDF and cosine similarity (scikit-learn). The knowledge base covers 18 security topics plus this site's assignments; project numbers are read from the same result files the website uses. 'Tell me more' style follow-ups reuse the previous question to give deeper detail.",
          "Optional generative AI: if a GEMINI_API_KEY is configured on the server, the top knowledge-base matches and the last six turns are sent to Google Gemini, which writes the answer grounded in that context. Without a key, or if Gemini fails, the retrieval answer is used.",
          `Monitoring: a Python script (backend/ml/seclog.py) generates a seeded week of logs with planted incidents and applies six detection rules (brute force, credential stuffing, SQL injection and XSS signatures, an HTTP-flood z-score, impossible travel) to produce ${t.detected_attacks} incidents and a weighted threat score shown on the Security Monitor page.`,
          "Hosting: Vercel, with the Next.js front end and FastAPI back end deployed as two services on one domain.",
        ],
      },
    ],
  },
  {
    id: "testing",
    title: "4. Testing results",
    blocks: [
      {
        type: "table",
        caption: "How these were checked: every row was typed into Shield in Chrome and the page state (theme, background, text size, video, URL) and reply were inspected; the parser also has an automated test (npm run test:intents, 27 phrases). Answers shown are local (no-key) mode. Voice input uses the same path once speech is transcribed.",
        head: ["Input", "Kind", "Expected", "Result"],
        rows: [
          ["Change the background to blue", "Command", "Background turns dark blue-toned", "Pass"],
          ["Set the background to a computer security image", "Command", "Shield-and-circuit security image behind the page", "Pass"],
          ["Switch to light mode / Make the text larger", "Command", "Light palette; text one step larger", "Pass"],
          ["Play music / Change the music / Pause the music", "Command", "Ambient track starts, switches, stops", "Pass"],
          ["Play the cybersecurity training video", "Command", "Assignment 7 movie opens and plays", "Pass"],
          ["Open the security dashboard / Go to assignment 7", "Command", "Navigates to /monitor and /assignments/assignment-7", "Pass"],
          ["Restore the original appearance", "Command", "All appearance changes undone, music and video stopped", "Pass"],
          ["Hello! Change the background to dark blue, play the cybersecurity training video, and teach me how to recognize phishing attacks", "Combined", "Greets, runs both actions, answers the phishing question", "Pass"],
          ["What is phishing, and how can I recognize a phishing email?", "Question", "Phishing answer with warning signs", "Pass"],
          ["What is the difference between DoS and DDoS attacks?", "Question", "Single source vs botnet; links Assignment 7", "Pass"],
          ["What is SQL injection? then: Tell me more", "Follow-up", "Definition, then the Security Monitor's SQLi example", "Pass"],
          ["How does multi-factor authentication work? / What should I do if I've been hacked?", "Question", "Factors explained; step-by-step response plan", "Pass"],
          ["What was Assignment 7 about? / What did Lab 1 cover?", "Project", "Answers built from this site's results", "Pass"],
          ["What is the capital of France?", "Off-topic", "Polite fallback listing what Shield can do", "Pass (no made-up answer)"],
          ["How can I reset my password?", "Edge case", "Treated as a question, not as 'reset the website'", "Pass"],
        ],
      },
    ],
  },
  {
    id: "privacy",
    title: "5. Security and privacy",
    blocks: [
      {
        type: "list",
        items: [
          "Whitelisted actions only: the parser can produce a fixed set of website actions. Shield cannot run code, open files, control other apps, or touch the operating system.",
          "No sensitive data: Shield never asks for passwords or payment details, and conversations aren't stored on the server. The page warns users not to share personal data.",
          "Voice stays in the browser's speech service and only starts when you press the mic button; the microphone isn't left on.",
          "Abuse limits: questions are capped at 500 characters and rate-limited per client (20 per minute).",
          "The API key for Gemini, if used, lives only in the server's environment variables, never in the browser.",
          "The monitoring log is synthetic; no real system or user was attacked or monitored.",
        ],
      },
    ],
  },
  {
    id: "limitations",
    title: "6. Limitations",
    blocks: [
      {
        type: "list",
        items: [
          "Voice input works in Chrome and Edge; Firefox and some mobile browsers don't support speech recognition, so typing is the fallback.",
          "The rule-based parser understands common phrasings but can miss unusual wording; unrecognised requests become questions instead.",
          "Retrieval answers come from a fixed knowledge base: they're accurate for covered topics but can be incomplete, and a close-but-wrong match is possible for unusual questions.",
          "With Gemini enabled, answers are more flexible but can contain mistakes (hallucinations); grounding in the knowledge base reduces but doesn't eliminate this. Users should verify important security advice.",
          "Only the assignments published on this site are in the knowledge base.",
          "Detection rules use fixed thresholds on synthetic data; real traffic would need tuning to balance false alarms against missed attacks.",
        ],
      },
    ],
  },
  {
    id: "challenges",
    title: "7. Challenges and improvements",
    blocks: [
      {
        type: "list",
        items: [
          "Compound commands: splitting on every 'and' broke questions like 'DoS and DDoS'. The fix was to split on 'and' only when a command verb follows, then merge neighbouring question clauses.",
          "Ambiguous words: 'reset my password' must not reset the website, so password and account requests are excluded from the reset rule.",
          "Readability: arbitrary background colors made text unreadable, so dark tones keep the dark theme and light tones switch to a full light palette.",
          "Browser autoplay rules: music and video need a user gesture, which the send button and mic button provide.",
          "Improvements: add a speaking 3D avatar, recognise intents with a small language model instead of rules, add a demo product catalog for shopping commands, stream live site logs into the monitor, and add more course assignments to the knowledge base.",
        ],
      },
    ],
  },
];
