import { parseCommand } from "../src/lib/assistant/intents.ts";
const cases: [string, string][] = [
  ["Hello! Change the background to dark blue, play the cybersecurity training video, and teach me how to recognize phishing attacks", "greet|background:dark blue|video:play|question"],
  ["Change the background to blue", "background:blue"],
  ["Make the text larger", "textSize:up"],
  ["make the font smaller please", "textSize:down"],
  ["Switch to dark mode", "theme:dark"],
  ["switch to light mode", "theme:light"],
  ["Set the background to a computer security image", "backgroundImage"],
  ["Play music", "music:play"],
  ["Pause the music", "music:pause"],
  ["Change the music", "music:next"],
  ["Play the cybersecurity training video", "video:play"],
  ["close the video", "video:close"],
  ["Open the cybersecurity learning section", "navigate:/security"],
  ["take me to the security dashboard", "navigate:/monitor"],
  ["go to assignment 7", "navigate:/assignments/assignment-7"],
  ["open lab 1", "navigate:/assignments/lab-1"],
  ["Restore the original appearance", "reset"],
  ["reset the website", "reset"],
  ["What is the difference between DoS and DDoS attacks?", "question"],
  ["How can I reset my password?", "question"],
  ["What is phishing, and how can I recognize a phishing email?", "question"],
  ["can you make the background light blue", "background:light blue"],
  ["scroll down", "scroll:down"],
  ["show me the evaluation results", "navigate:/evaluation"],
  ["what can you do", "help"],
  ["go home and play music", "navigate:/|music:play"],
  ["tell me more", "question"],
];
let fail = 0;
for (const [input, want] of cases) {
  const got = parseCommand(input).map((a) => a.type + ("color" in a ? ":" + a.color : "op" in a ? ":" + a.op : "mode" in a ? ":" + a.mode : "dir" in a ? ":" + a.dir : "href" in a ? ":" + a.href : "")).join("|");
  if (got !== want) { fail++; console.log("FAIL", JSON.stringify(input), "\n  want", want, "\n  got ", got); }
}
console.log(`${cases.length - fail}/${cases.length} intent cases passed`);
if (fail) process.exit(1);
