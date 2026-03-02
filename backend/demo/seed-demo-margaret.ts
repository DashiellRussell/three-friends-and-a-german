/**
 * Seed Demo Data for Margaret "Maggie" Thornton
 *
 * Seeds: medications, check-ins (past week), symptoms, medication logs,
 * and documents for an EXISTING profile (margaret@tessera.health).
 *
 * Usage:
 *   cd backend && npx ts-node demo/seed-demo-margaret.ts
 */

import dotenv from "dotenv";
import * as path from "path";
dotenv.config({ path: path.resolve(__dirname, "../.env") });

import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

const EMAIL = "margaret@tessera.health";

// ── Medications ──
const MEDICATIONS = [
  { name: "Metformin", dosage: "1000mg", frequency: "twice daily", time_of_day: "morning, evening", instructions: "Take with food" },
  { name: "Amlodipine", dosage: "10mg", frequency: "daily", time_of_day: "morning", instructions: "Blood pressure" },
  { name: "Atorvastatin", dosage: "20mg", frequency: "daily", time_of_day: "night", instructions: "Cholesterol" },
];

// ── Check-ins (past 7 days, aligned with demo script context) ──
function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(8, Math.floor(Math.random() * 15), 0, 0); // 8:00-8:15am AEST
  return d.toISOString();
}

interface CheckInPlan {
  daysAgo: number;
  transcript: string;
  mood: string;
  energy: number;
  sleep_hours: number;
  summary: string;
  notes: string;
  flagged: boolean;
  flag_reason: string | null;
  symptoms: Array<{
    name: string;
    severity: number;
    body_area: string;
    is_critical: boolean;
    alert_level: "info" | "warning" | "critical";
    alert_message: string | null;
  }>;
  meds_taken: string[]; // medication names taken that day
}

const CHECKINS: CheckInPlan[] = [
  {
    daysAgo: 6,
    transcript: "Oh I'm alright, love. Slept about six and a half hours which isn't bad for me. Had a bit of a headache when I woke up but it's mostly gone now. I noticed a couple of those little spots floating across my left eye yesterday — you know, like tiny cobwebs — but I've had those before. Checked my blood pressure this morning, it was 158 over 94. I had my tablets with breakfast.",
    mood: "okay",
    energy: 5,
    sleep_hours: 6.5,
    summary: "Mild headache on waking, floaters in left eye, BP 158/94. Took medications.",
    notes: "Headache resolved. Visual floaters in left eye — patient reports as recurring. BP slightly elevated. Medications taken with breakfast.",
    flagged: false,
    flag_reason: null,
    symptoms: [
      { name: "headache", severity: 3, body_area: "head", is_critical: false, alert_level: "info", alert_message: null },
      { name: "visual floaters", severity: 3, body_area: "head", is_critical: false, alert_level: "info", alert_message: null },
    ],
    meds_taken: ["Metformin", "Amlodipine"],
  },
  {
    daysAgo: 5,
    transcript: "Morning, love. Slept a bit better, about seven hours. The headache's back though — it's a dull sort of ache sitting behind my eyes. Those little spots in my left eye are still there, seem a bit more noticeable today when I look at the window. Blood pressure was 162 over 96 this morning. Took all my tablets.",
    mood: "okay",
    energy: 5,
    sleep_hours: 7,
    summary: "Recurring headache behind eyes, floaters more noticeable, BP rising to 162/96.",
    notes: "Headache persisting — described as dull, behind eyes. Floaters in left eye increasing in prominence. BP trending upward. All medications taken.",
    flagged: false,
    flag_reason: null,
    symptoms: [
      { name: "headache", severity: 4, body_area: "head", is_critical: false, alert_level: "info", alert_message: null },
      { name: "visual floaters", severity: 4, body_area: "head", is_critical: false, alert_level: "info", alert_message: null },
      { name: "elevated blood pressure", severity: 5, body_area: "cardiovascular", is_critical: false, alert_level: "warning", alert_message: "BP 162/96 — trending upward, recommend monitoring" },
    ],
    meds_taken: ["Metformin", "Amlodipine", "Atorvastatin"],
  },
  {
    daysAgo: 4,
    transcript: "Hello love. Woke up a bit dizzy this morning — had to hold the wall when I got out of bed. It passed after a few seconds. No spots in my eye today so far. Headache is mild. I'm a bit more tired in the evenings lately but I suppose that's the weather. Slept about six hours.",
    mood: "okay",
    energy: 4,
    sleep_hours: 6,
    summary: "Dizziness on standing, mild headache, increased evening fatigue. No floaters today.",
    notes: "Orthostatic dizziness on waking — resolved quickly. Mild headache continuing. Patient attributes fatigue to weather. Sleep slightly reduced.",
    flagged: false,
    flag_reason: null,
    symptoms: [
      { name: "dizziness", severity: 4, body_area: "head", is_critical: false, alert_level: "info", alert_message: null },
      { name: "headache", severity: 3, body_area: "head", is_critical: false, alert_level: "info", alert_message: null },
    ],
    meds_taken: ["Metformin", "Amlodipine"],
  },
  {
    daysAgo: 2,
    transcript: "Not my best morning, love. This headache won't leave — it's behind my eyes and goes into my neck. Last night my vision went a bit blurry around the edges of my left eye for about a minute, like looking through foggy glass, then it cleared. That worried me a bit. Blood pressure this morning was 171 over 101 — that's the highest I've seen in months. My feet have been tingly and a bit numb at night too. Only got about five and a half hours sleep.",
    mood: "worried",
    energy: 3,
    sleep_hours: 5.5,
    summary: "Persistent headache, transient blurry peripheral vision (left eye), BP spike 171/101, foot tingling.",
    notes: "Headache radiating to neck. Episode of transient peripheral visual blurring in left eye (~1 min, self-resolving). BP significantly elevated at 171/101. Bilateral foot paraesthesia at night — possible peripheral neuropathy. Sleep poor.",
    flagged: true,
    flag_reason: "Visual disturbance combined with BP 171/101 and diabetes — possible retinopathy or vascular event risk",
    symptoms: [
      { name: "headache", severity: 6, body_area: "head", is_critical: false, alert_level: "warning", alert_message: "Persistent headache with visual symptoms — recommend GP review" },
      { name: "transient visual blurring", severity: 6, body_area: "head", is_critical: false, alert_level: "warning", alert_message: "Blurry peripheral vision in left eye — monitor closely" },
      { name: "elevated blood pressure", severity: 7, body_area: "cardiovascular", is_critical: false, alert_level: "warning", alert_message: "BP 171/101 — highest reading this month, recommend urgent GP review" },
      { name: "peripheral tingling", severity: 4, body_area: "extremities", is_critical: false, alert_level: "info", alert_message: null },
    ],
    meds_taken: ["Metformin", "Amlodipine", "Atorvastatin"],
  },
  {
    daysAgo: 1,
    transcript: "Morning love. Had another dizzy spell yesterday — had to sit down in the kitchen for a few minutes. This morning I saw flashing lights in the corner of my left eye, like little sparks, for about half a minute. That was a bit frightening. Blood pressure is still up, 168 over 99. Headache's back again. Feet still tingling at night. Slept about six hours. I keep meaning to ring the GP but I forget.",
    mood: "worried",
    energy: 3,
    sleep_hours: 6,
    summary: "Dizziness episode, photopsia (flashing lights left eye), BP 168/99, recurring headache, foot tingling.",
    notes: "Repeated dizziness — required sitting down. New symptom: photopsia (flashing lights) in left eye for ~30 seconds. BP remains elevated 168/99. Headache recurring. Foot tingling persists. Patient has not yet contacted GP.",
    flagged: true,
    flag_reason: "Photopsia + sustained hypertension (158→162→171→168) + T2DM = high-priority retinopathy/vascular referral signal",
    symptoms: [
      { name: "dizziness", severity: 5, body_area: "head", is_critical: false, alert_level: "warning", alert_message: "Recurring dizziness episodes — recommend assessment" },
      { name: "photopsia", severity: 7, body_area: "head", is_critical: true, alert_level: "critical", alert_message: "Flashing lights in left eye — urgent ophthalmology referral recommended" },
      { name: "headache", severity: 5, body_area: "head", is_critical: false, alert_level: "warning", alert_message: "Recurring headaches with visual symptoms" },
      { name: "elevated blood pressure", severity: 7, body_area: "cardiovascular", is_critical: false, alert_level: "warning", alert_message: "BP 168/99 — sustained elevation this week" },
    ],
    meds_taken: ["Metformin", "Amlodipine"],
  },
];

// ── Documents ──
const DOCUMENTS = [
  {
    daysAgo: 5,
    type: "lab_report" as const,
    fileName: "blood_test_results_hba1c_panel.pdf",
    summary: "Blood test showing HbA1c at 8.4% (poorly controlled diabetes), elevated triglycerides, borderline LDL cholesterol, and borderline kidney function. GP recommends medication review, dietary changes, and urgent ophthalmology referral.",
    content: `PATHOLOGY REPORT
Patient: Margaret Thornton
DOB: 22/04/1953
Requesting Physician: Dr. Alan Marsh, Bankstown Medical Centre

GLYCAEMIC CONTROL:
- HbA1c: 8.4% (Reference: <7.0%) — HIGH
  Estimated average glucose: 11.0 mmol/L

FASTING LIPID PANEL:
- Total Cholesterol: 5.8 mmol/L (Reference: <5.5) — BORDERLINE HIGH
- LDL Cholesterol: 3.6 mmol/L (Reference: <3.5) — BORDERLINE HIGH
- HDL Cholesterol: 1.2 mmol/L (Reference: >1.3) — LOW
- Triglycerides: 2.1 mmol/L (Reference: <1.7) — HIGH

RENAL FUNCTION:
- eGFR: 61 mL/min (Reference: >60) — Low normal
- Urine Albumin/Creatinine Ratio: 3.8 mg/mmol (Reference: <3.5) — BORDERLINE

INTERPRETATION:
Suboptimal glycaemic control (HbA1c 8.4%). Elevated triglycerides and borderline LDL. Recommend metformin dose review, dietary counselling, urgent ophthalmology referral given visual symptoms.`,
  },
  {
    daysAgo: 3,
    type: "other" as const,
    fileName: "gp_referral_ophthalmologist_dr_nair.pdf",
    summary: "GP referral to ophthalmologist Dr. Priya Nair for comprehensive eye assessment. Patient has progressive visual symptoms (floaters, photopsia, transient blurring) combined with uncontrolled T2DM and sustained hypertension. Concern for diabetic or hypertensive retinopathy.",
    content: `SPECIALIST REFERRAL LETTER
From: Dr. Alan Marsh, Bankstown Medical Centre
To: Dr. Priya Nair, Sydney Eye Specialists

RE: Margaret Thornton, DOB 22/04/1953

Mrs. Thornton is a 72-year-old woman with T2DM (12 years) and hypertension (9 years). Over the past 10 days she has reported progressive visual symptoms in the left eye: persistent floaters, transient peripheral blurring, and photopsia (flashing lights).

HbA1c: 8.4% (suboptimal). BP: persistently elevated (range 158-171/94-101). Also reporting bilateral distal foot paraesthesia at night.

Current medications: Metformin 1000mg BD, Amlodipine 10mg daily, Atorvastatin 20mg nocte. Allergies: Sulfonamides.

Clinical concern: combination of uncontrolled T2DM, sustained hypertension, and progressive unilateral visual symptoms raises concern for diabetic/hypertensive retinopathy.

Yours sincerely, Dr. Alan Marsh`,
  },
];

// ── Main ──
async function main() {
  console.log("=== Tessera Demo — Seeding data for Margaret Thornton ===\n");

  // Look up existing profile
  const { data: profile, error: profileErr } = await supabase
    .from("profiles")
    .select("id, display_name")
    .eq("email", EMAIL)
    .single();

  if (profileErr || !profile) {
    console.error(`Profile not found for ${EMAIL}. Create the profile first, then run this script.`);
    process.exit(1);
  }

  const userId = profile.id;
  console.log(`Found profile: ${profile.display_name} (${userId})\n`);

  // ── Medications ──
  console.log("Inserting medications...");
  const medMap: Record<string, string> = {}; // name -> id

  for (const med of MEDICATIONS) {
    const { data, error } = await supabase
      .from("medications")
      .insert({ user_id: userId, ...med, active: true })
      .select("id")
      .single();

    if (error) {
      console.error(`  Failed: ${med.name} — ${error.message}`);
      continue;
    }
    medMap[med.name] = data.id;
    console.log(`  ${med.name} ${med.dosage} (${med.frequency}) — ${data.id}`);
  }

  // ── Check-ins + symptoms + medication logs ──
  console.log(`\nInserting ${CHECKINS.length} check-ins...\n`);

  for (const plan of CHECKINS) {
    const createdAt = daysAgo(plan.daysAgo);
    const scheduledDate = createdAt.split("T")[0];

    // Insert check-in
    const { data: checkin, error: ciErr } = await supabase
      .from("check_ins")
      .insert({
        user_id: userId,
        input_mode: "voice",
        transcript: plan.transcript,
        mood: plan.mood,
        energy: plan.energy,
        sleep_hours: plan.sleep_hours,
        summary: plan.summary,
        notes: plan.notes,
        flagged: plan.flagged,
        flag_reason: plan.flag_reason,
        created_at: createdAt,
      })
      .select("id")
      .single();

    if (ciErr || !checkin) {
      console.error(`  Failed check-in (${plan.daysAgo}d ago): ${ciErr?.message}`);
      continue;
    }
    console.log(`  Day -${plan.daysAgo}: mood=${plan.mood}, energy=${plan.energy}, sleep=${plan.sleep_hours}h${plan.flagged ? " [FLAGGED]" : ""}`);

    // Insert symptoms
    for (const s of plan.symptoms) {
      await supabase.from("symptoms").insert({
        user_id: userId,
        check_in_id: checkin.id,
        name: s.name,
        severity: s.severity,
        body_area: s.body_area,
        is_critical: s.is_critical,
        alert_level: s.alert_level,
        alert_message: s.alert_message,
        created_at: createdAt,
      });
    }
    if (plan.symptoms.length > 0) {
      console.log(`    Symptoms: ${plan.symptoms.map(s => s.name).join(", ")}`);
    }

    // Insert medication logs
    for (const medName of plan.meds_taken) {
      const medId = medMap[medName];
      if (!medId) continue;
      await supabase.from("medication_logs").insert({
        user_id: userId,
        medication_id: medId,
        check_in_id: checkin.id,
        taken: true,
        scheduled_date: scheduledDate,
        source: "voice",
        logged_at: createdAt,
      });
    }
    if (plan.meds_taken.length > 0) {
      console.log(`    Meds taken: ${plan.meds_taken.join(", ")}`);
    }
  }

  // ── Documents ──
  console.log(`\nInserting ${DOCUMENTS.length} documents...\n`);

  for (const doc of DOCUMENTS) {
    const createdAt = daysAgo(doc.daysAgo);

    const { data, error } = await supabase
      .from("documents")
      .insert({
        user_id: userId,
        file_name: doc.fileName,
        file_url: "",
        file_type: "application/pdf",
        document_type: doc.type,
        summary: doc.summary,
        created_at: createdAt,
      })
      .select("id")
      .single();

    if (error) {
      console.error(`  Failed: ${doc.fileName} — ${error.message}`);
      continue;
    }
    console.log(`  ${doc.fileName} (${doc.type}) — ${data.id}`);
  }

  // ── Summary ──
  const symptomCount = CHECKINS.reduce((n, c) => n + c.symptoms.length, 0);
  const medLogCount = CHECKINS.reduce((n, c) => n + c.meds_taken.length, 0);

  console.log("\n=== Seeding Complete ===");
  console.log(`  User ID:         ${userId}`);
  console.log(`  Email:           ${EMAIL}`);
  console.log(`  Medications:     ${MEDICATIONS.length}`);
  console.log(`  Check-ins:       ${CHECKINS.length}`);
  console.log(`  Symptoms:        ${symptomCount}`);
  console.log(`  Medication logs: ${medLogCount}`);
  console.log(`  Documents:       ${DOCUMENTS.length}`);
  console.log("========================\n");
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
