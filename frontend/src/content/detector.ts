export interface Preset {
  id: string;
  label: string;
  category: "spam" | "ham";
  text: string;
}

export const PRESETS: Preset[] = [
  { id: "prize", label: "Prize scam", category: "spam", text: "Congratulations! You've won a free iPhone. Click now." },
  { id: "premium", label: "Premium-rate", category: "spam", text: "WINNER!! As a valued network customer you have been selected to receive a £900 prize reward! To claim call 09061701461. Valid 12 hours only." },
  { id: "phishing", label: "Bank phishing", category: "spam", text: "URGENT: Your account has been locked due to suspicious activity. Verify your identity now at secure-bank-verify.co/login" },
  { id: "delivery", label: "Delivery smishing", category: "spam", text: "Your parcel could not be delivered. Reschedule here: dhl-parcel.top/x8k2 before it is returned." },
  { id: "friend", label: "Friend", category: "ham", text: "Hey, are we still on for dinner tonight? I can pick you up around 7." },
  { id: "work", label: "Work", category: "ham", text: "Running 10 min late for the standup, start without me and I'll catch up." },
  { id: "tricky", label: "Tricky ham", category: "ham", text: "Call me now when you're free, I won the argument with mum about the trip lol" },
];

export const MAX_CHARS = 5000;
