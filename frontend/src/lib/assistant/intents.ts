/**
 * Turns a typed or spoken request into whitelisted website actions. Anything that isn't a recognised action is
 * passed on as a question for the security knowledge base. The assistant can only ever run these actions.
 */

export type Action =
  | { type: "background"; color: string; hsl: string; light: boolean }
  | { type: "backgroundImage" }
  | { type: "theme"; mode: "dark" | "light" }
  | { type: "textSize"; dir: "up" | "down" | "reset" }
  | { type: "music"; op: "play" | "pause" | "next" }
  | { type: "video"; op: "play" | "close" }
  | { type: "navigate"; href: string; label: string }
  | { type: "scroll"; dir: "up" | "down" | "top" | "bottom" }
  | { type: "reset" }
  | { type: "help" }
  | { type: "greet" }
  | { type: "question"; text: string };

/** Dark tones keep the dark UI readable; light tones switch the site to its light palette. */
export const COLORS: Record<string, { hsl: string; light: boolean }> = {
  "dark blue": { hsl: "222 75% 11%", light: false },
  "navy blue": { hsl: "225 70% 12%", light: false },
  navy: { hsl: "225 70% 12%", light: false },
  "light blue": { hsl: "205 90% 90%", light: true },
  "sky blue": { hsl: "200 85% 86%", light: true },
  blue: { hsl: "218 65% 18%", light: false },
  "dark red": { hsl: "350 60% 10%", light: false },
  red: { hsl: "355 55% 17%", light: false },
  "dark green": { hsl: "150 55% 8%", light: false },
  "light green": { hsl: "140 55% 88%", light: true },
  green: { hsl: "150 45% 14%", light: false },
  purple: { hsl: "268 50% 16%", light: false },
  violet: { hsl: "262 50% 17%", light: false },
  teal: { hsl: "180 55% 12%", light: false },
  cyan: { hsl: "190 60% 14%", light: false },
  orange: { hsl: "25 60% 15%", light: false },
  pink: { hsl: "330 70% 90%", light: true },
  yellow: { hsl: "50 90% 88%", light: true },
  black: { hsl: "0 0% 3%", light: false },
  "dark gray": { hsl: "220 8% 12%", light: false },
  "dark grey": { hsl: "220 8% 12%", light: false },
  gray: { hsl: "220 9% 20%", light: false },
  grey: { hsl: "220 9% 20%", light: false },
  white: { hsl: "0 0% 100%", light: true },
};
const COLOR_RE = new RegExp(`\\b(${Object.keys(COLORS).join("|")})\\b`, "i");

const PAGES: { re: RegExp; href: string; label: string }[] = [
  { re: /\blab\s*(1|one)\b/, href: "/assignments/lab-1", label: "Lab 1" },
  { re: /\bassignment\s*(6|six)\b/, href: "/assignments/assignment-6", label: "Assignment 6" },
  { re: /\bassignment\s*(7|seven)\b/, href: "/assignments/assignment-7", label: "Assignment 7" },
  { re: /\bassignment\s*(8|eight)\b/, href: "/assignments/assignment-8", label: "Assignment 8" },
  { re: /\bassignments?\b/, href: "/assignments", label: "Assignments" },
  { re: /\b(monitor(ing)?|dashboard|threat level|security logs?|intrusion)\b/, href: "/monitor", label: "Security Monitor" },
  { re: /\b(live )?detector|spam checker|check a message\b/, href: "/detector", label: "Live Detector" },
  { re: /\b(explainab\w*|xai|shap)\b/, href: "/explainability", label: "Explainable AI" },
  { re: /\b(security analysis|cyber ?security learning|learning|security section|threats?)\b/, href: "/security", label: "Security Analysis" },
  { re: /\bdataset|data set\b/, href: "/dataset", label: "Dataset" },
  { re: /\b(eda|exploratory)\b/, href: "/eda", label: "Exploratory Data Analysis" },
  { re: /\bpreprocessing\b/, href: "/preprocessing", label: "Preprocessing" },
  { re: /\bmodels?\b/, href: "/models", label: "Models" },
  { re: /\b(evaluation|results|metrics)\b/, href: "/evaluation", label: "Evaluation" },
  { re: /\b(docs|documentation)\b/, href: "/docs", label: "Documentation" },
  { re: /\b(report|presentation)\b/, href: "/report", label: "Report" },
  { re: /\b(home|homepage|home page|main page|start page)\b/, href: "/", label: "Home" },
];

const VERBS =
  "change|set|make|switch|turn|play|pause|stop|resume|open|go|show|take|navigate|bring|visit|reset|restore|teach|tell|explain|what|how|why|scroll|increase|decrease|close|skip|start|put|use|give";
const SPLIT_RE = new RegExp(
  `\\s*(?:[.!?;](?:\\s+|$)|,\\s*(?:and\\s+|then\\s+)?|\\s+(?:and\\s+then|then|also)\\s+|\\s+and\\s+(?=(?:please\\s+)?(?:${VERBS})\\b))\\s*`,
  "i",
);
const QUESTION_START =
  /^(what|how|why|when|who|where|which|is|are|does|do|should|teach|explain|define|describe|tell me (about|how|what|why|more))\b/;

export function splitClauses(input: string): string[] {
  return input
    .split(SPLIT_RE)
    .map((c) => c.trim())
    .filter((c) => c.length > 0);
}

function navTarget(text: string) {
  return PAGES.find((p) => p.re.test(text));
}

export function parseClause(raw: string): Action {
  const text = raw
    .toLowerCase()
    .replace(/^(hey|ok|okay)\s+shield[,\s]*/, "")
    .replace(/^(please|can you|could you|would you|will you|i want you to|i'd like you to)\s+/, "")
    .replace(/\s+please$/, "")
    .trim();

  if (/^(hi|hello|hey|good (morning|afternoon|evening)|greetings)\b[\s!.]*$/.test(text)) return { type: "greet" };
  if (/^(help|what can you do|what commands|show (me )?(the )?commands|list commands)\b/.test(text)) return { type: "help" };

  const isQuestion = QUESTION_START.test(text);
  if (!isQuestion || /^what('s| is) (on )?the (threat level)/.test(text)) {
    if (/\b(reset|restore|undo|revert)\b/.test(text) && !/password|account/.test(text)) return { type: "reset" };
    if (/\b(original|default) (look|appearance|settings|style|theme)\b/.test(text)) return { type: "reset" };

    if (/\b(music|song|track|tunes|soundtrack)\b/.test(text)) {
      if (/\b(pause|stop|turn off|mute|silence|end)\b/.test(text)) return { type: "music", op: "pause" };
      if (/\b(change|next|skip|switch|another|different|new)\b/.test(text)) return { type: "music", op: "next" };
      return { type: "music", op: "play" };
    }
    if (/\b(video|movie|film|training)\b/.test(text)) {
      if (/\b(close|stop|hide|exit|pause|end)\b/.test(text)) return { type: "video", op: "close" };
      return { type: "video", op: "play" };
    }

    if (/\b(dark mode|dark theme|night mode|turn off the lights?)\b/.test(text)) return { type: "theme", mode: "dark" };
    if (/\b(light mode|light theme|day mode|turn on the lights?)\b/.test(text)) return { type: "theme", mode: "light" };

    if (/\b(text|font|words|letters|zoom|size)\b/.test(text)) {
      if (/\b(normal|default|regular|original)\b/.test(text)) return { type: "textSize", dir: "reset" };
      if (/\b(larger|bigger|increase|enlarge|grow|zoom in|large|big)\b/.test(text)) return { type: "textSize", dir: "up" };
      if (/\b(smaller|decrease|shrink|reduce|zoom out|small|tiny)\b/.test(text)) return { type: "textSize", dir: "down" };
    }

    if (/\b(background|wallpaper|backdrop)\b/.test(text) && /\b(image|picture|photo|wallpaper|security|cyber|hacker|circuit)\b/.test(text)) {
      return { type: "backgroundImage" };
    }
    const color = text.match(COLOR_RE)?.[1];
    if (color && /\b(background|page|color|colour|paint|theme|make it|turn it|change it|set it)\b/.test(text)) {
      return { type: "background", color, ...COLORS[color] };
    }

    if (/\bscroll\b|\b(page )?(up|down)\b$|\b(top|bottom) of (the )?page\b/.test(text)) {
      if (/\btop\b/.test(text)) return { type: "scroll", dir: "top" };
      if (/\bbottom\b/.test(text)) return { type: "scroll", dir: "bottom" };
      return { type: "scroll", dir: /\bup\b/.test(text) ? "up" : "down" };
    }

    if (/\b(open|go( back)? to|go|take me( to)?|navigate( to)?|show( me)?|bring up|visit|load|jump to|switch to)\b/.test(text)) {
      const page = navTarget(text);
      if (page) return { type: "navigate", href: page.href, label: page.label };
    }
  }

  return { type: "question", text: raw.trim() };
}

export function parseCommand(input: string): Action[] {
  const out: Action[] = [];
  for (const action of splitClauses(input).map(parseClause)) {
    const prev = out[out.length - 1];
    if (action.type === "question" && prev?.type === "question") prev.text = `${prev.text}, ${action.text}`;
    else out.push(action);
  }
  return out;
}

export const COMMAND_EXAMPLES = [
  "Change the background to dark blue",
  "Set the background to a security image",
  "Switch to light mode",
  "Make the text larger",
  "Play music",
  "Change the music",
  "Play the cybersecurity training video",
  "Open the security dashboard",
  "Go to assignment 7",
  "Restore the original appearance",
];

export const QUESTION_EXAMPLES = [
  "How can I recognize a phishing email?",
  "What is the difference between DoS and DDoS?",
  "How does multi-factor authentication work?",
  "What is SQL injection?",
  "What was Assignment 7 about?",
];
