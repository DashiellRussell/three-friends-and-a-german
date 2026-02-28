export interface CheckIn {
  id: number;
  date: string;
  time: string;
  mood: "Great" | "Good" | "Okay";
  energy: number;
  sleep: number;
  symptoms: string[];
  meds: { name: string; taken: boolean }[];
  note: string;
  flagged: boolean;
  flag?: string;
}

export interface LabResult {
  metric: string;
  value: string;
  status: "normal" | "elevated" | "low";
  note?: string;
}

export interface ConversationMessage {
  role: "ai" | "user";
  text: string;
}

export const CHECKINS: CheckIn[] = [
  { id: 1, date: "Feb 28", time: "8:15 AM", mood: "Good", energy: 7, sleep: 6.5, symptoms: ["Mild headache", "Neck stiffness"], meds: [{ name: "Metformin 500mg", taken: true }, { name: "Vitamin D", taken: true }], note: "Headache started after waking, possibly from sleeping position.", flagged: false },
  { id: 2, date: "Feb 27", time: "8:30 AM", mood: "Okay", energy: 5, sleep: 5, symptoms: ["Fatigue", "Increased thirst"], meds: [{ name: "Metformin 500mg", taken: true }, { name: "Vitamin D", taken: false }], note: "Didn't sleep well. Feeling more thirsty than usual.", flagged: true, flag: "Increased thirst + fatigue may correlate with elevated HbA1c" },
  { id: 3, date: "Feb 26", time: "8:00 AM", mood: "Great", energy: 8, sleep: 7.5, symptoms: [], meds: [{ name: "Metformin 500mg", taken: true }, { name: "Vitamin D", taken: true }], note: "Feeling good. 30-min walk yesterday evening.", flagged: false },
  { id: 4, date: "Feb 25", time: "8:20 AM", mood: "Okay", energy: 6, sleep: 6, symptoms: ["Mild fatigue"], meds: [{ name: "Metformin 500mg", taken: true }, { name: "Vitamin D", taken: true }], note: "A bit tired but otherwise fine.", flagged: false },
  { id: 5, date: "Feb 24", time: "8:10 AM", mood: "Good", energy: 7, sleep: 7, symptoms: [], meds: [{ name: "Metformin 500mg", taken: true }, { name: "Vitamin D", taken: true }], note: "Good day overall.", flagged: false },
  { id: 6, date: "Feb 23", time: "8:25 AM", mood: "Okay", energy: 5, sleep: 5.5, symptoms: ["Mild fatigue"], meds: [{ name: "Metformin 500mg", taken: true }, { name: "Vitamin D", taken: false }], note: "Tired, stayed up late.", flagged: false },
  { id: 7, date: "Feb 22", time: "8:05 AM", mood: "Great", energy: 8, sleep: 8, symptoms: [], meds: [{ name: "Metformin 500mg", taken: true }, { name: "Vitamin D", taken: true }], note: "Well rested.", flagged: false },
];

export const LAB_RESULTS: LabResult[] = [
  { metric: "HbA1c", value: "6.8%", status: "elevated", note: "Above target (< 6.5%)" },
  { metric: "Vitamin D", value: "22 ng/mL", status: "low", note: "Below optimal (30-50)" },
  { metric: "Cholesterol", value: "195 mg/dL", status: "normal", note: "Within range" },
  { metric: "TSH", value: "2.1 mIU/L", status: "normal", note: "Within range" },
];

export const CONVERSATION: ConversationMessage[] = [
  { role: "ai", text: "Good morning. How are you feeling today?" },
  { role: "user", text: "I'm alright, maybe a 7 out of 10." },
  { role: "ai", text: "Good to hear. How was your sleep?" },
  { role: "user", text: "About six and a half hours. Woke up with a stiff neck." },
  { role: "ai", text: "Any other symptoms today?" },
  { role: "user", text: "A mild headache, probably from the neck." },
  { role: "ai", text: "Have you taken your medications?" },
  { role: "user", text: "Yes, Metformin and Vitamin D with breakfast." },
  { role: "ai", text: "All logged. Monitor the headache — if it persists, mention it at your next visit." },
];

export const REPORT_DATA = {
  findings: [
    "HbA1c increased from 6.5% to 6.8% over 3 months",
    "Vitamin D suboptimal at 22 ng/mL despite supplementation",
    "Increased thirst and fatigue reported Feb 27, correlating with HbA1c trend",
    "Sleep inconsistent — 5 to 7.5 hours across reporting period",
    "Medication adherence: Metformin 100%, Vitamin D 75%",
  ],
  actions: [
    "Review Metformin dosage given HbA1c trajectory",
    "Consider Vitamin D dosage adjustment",
    "Discuss sleep hygiene — inconsistent sleep may affect glycaemic control",
    "Follow up on increased thirst symptom",
  ],
};

export function statusVariant(s: string): "good" | "warn" | "bad" | "default" {
  if (s === "normal") return "good";
  if (s === "elevated") return "bad";
  if (s === "low") return "warn";
  return "default";
}

export const MOOD_MAP: Record<string, number> = { Great: 3, Good: 2, Okay: 1 };
