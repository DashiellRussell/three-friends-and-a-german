import dotenv from "dotenv";
dotenv.config();

import { supabase } from "../services/supabase";
import { extractCheckinData, embedText } from "../services/mistral";
import { mistral } from "../services/mistral";
import { processDocument } from "../services/documentPipeline";

// ── CLI Args ──
const args = process.argv.slice(2);
const CLEAN = args.includes("--clean");
const userIdArg = args.find((a) => a.startsWith("--user-id="));
const TARGET_USER_ID = userIdArg ? userIdArg.split("=")[1] : null;

// ── Patient persona ──
const AMARA_PROFILE = {
  email: "amara.demo@kira.health",
  display_name: "Amara Wanjiku",
  date_of_birth: "1992-03-15",
  gender: "Female",
  blood_type: "O+",
  conditions: ["suspected anemia (unconfirmed)", "recurring migraines", "mild asthma"],
  allergies: ["penicillin"],
  phone_number: "+254712345678",
  timezone: "Africa/Nairobi",
  language: "en",
  onboarding_completed: true,
  onboarding_step: 4,
};

// ── Story arc check-ins ──
interface DayPlan {
  day: number;
  storyContext: string;
  expectedMood: string;
  expectedEnergy: number;
  expectedSleep: number;
  hasSymptoms: boolean;
  flagged: boolean;
}

const CHECKIN_PLANS: DayPlan[] = [
  // Week 1: Increasing fatigue, dizziness, headaches
  { day: 1, storyContext: "Amara is feeling ok but a bit tired today. She walked to the market and felt slightly winded. Slept about 6 hours. No major complaints yet.", expectedMood: "okay", expectedEnergy: 5, expectedSleep: 6, hasSymptoms: false, flagged: false },
  { day: 2, storyContext: "Amara had a headache this morning that lasted a few hours. She feels more tired than usual. She mentions she had to rest after walking to the water pump because she felt dizzy. Slept 5.5 hours.", expectedMood: "tired", expectedEnergy: 4, expectedSleep: 5.5, hasSymptoms: true, flagged: false },
  { day: 3, storyContext: "Amara is feeling a bit better today, no headache. But she still feels weak and low energy. She ate some ugali and greens. Slept about 6 hours.", expectedMood: "okay", expectedEnergy: 4, expectedSleep: 6, hasSymptoms: false, flagged: false },
  { day: 5, storyContext: "Amara had another bad headache and felt dizzy when she stood up quickly. She is worried about feeling so tired all the time. Difficulty walking to the water pump again. Sleep was poor, about 5 hours.", expectedMood: "worried", expectedEnergy: 3, expectedSleep: 5, hasSymptoms: true, flagged: true },
  { day: 6, storyContext: "Amara went to the mobile clinic today and got a blood test done. She is waiting for results. Feeling exhausted. Had a mild headache in the afternoon. Sleep was about 5.5 hours.", expectedMood: "anxious", expectedEnergy: 3, expectedSleep: 5.5, hasSymptoms: true, flagged: false },
  { day: 7, storyContext: "Amara got her blood test results. The nurse said her hemoglobin is borderline low. She feels relieved to have an answer but worried about what it means. Energy is very low today. Slept 6 hours.", expectedMood: "relieved", expectedEnergy: 3, expectedSleep: 6, hasSymptoms: true, flagged: true },

  // Week 2: Started iron supplements, stomach cramps, breathlessness episode
  { day: 8, storyContext: "Amara started taking iron supplements today as the clinic suggested. She's hopeful it will help. Feeling tired but slightly more optimistic. Slept about 6 hours.", expectedMood: "hopeful", expectedEnergy: 4, expectedSleep: 6, hasSymptoms: false, flagged: false },
  { day: 9, storyContext: "The iron tablets are causing stomach cramps. Amara feels nauseous after taking them. But she thinks her energy is slightly better than last week. Headache came back briefly. Slept 6.5 hours.", expectedMood: "okay", expectedEnergy: 5, expectedSleep: 6.5, hasSymptoms: true, flagged: false },
  { day: 10, storyContext: "Amara had an episode of breathlessness after carrying water. She had to sit down and use her inhaler. The stomach cramps from iron continue. She is a bit scared about the breathing. Slept about 6 hours.", expectedMood: "scared", expectedEnergy: 4, expectedSleep: 6, hasSymptoms: true, flagged: true },
  { day: 12, storyContext: "Amara is feeling better than earlier this week. The stomach cramps are still there but less severe. She took her iron supplement with food as someone suggested. Energy feels a bit better today. Slept 7 hours.", expectedMood: "better", expectedEnergy: 5, expectedSleep: 7, hasSymptoms: true, flagged: false },
  { day: 14, storyContext: "Amara had a headache today but it was milder than before. She went to the pharmacy and got her iron prescription renewed. No breathlessness episode this week since the first one. Stomach cramps are manageable. Slept 6.5 hours.", expectedMood: "okay", expectedEnergy: 5, expectedSleep: 6.5, hasSymptoms: true, flagged: false },

  // Week 3: Energy improving, migraine with aura, doctor appointment prep
  { day: 15, storyContext: "Amara is noticing her energy is genuinely getting better. She could walk to the pump and back without resting. The iron supplements are still causing mild stomach issues but nothing too bad. Slept 7 hours.", expectedMood: "good", expectedEnergy: 6, expectedSleep: 7, hasSymptoms: true, flagged: false },
  { day: 16, storyContext: "Amara had a bad headache with visual disturbance — she saw zigzag lines before the headache started. It was very intense and she had to lie down in a dark room for hours. She is frightened by the visual symptoms. Slept 5 hours because of the pain.", expectedMood: "scared", expectedEnergy: 3, expectedSleep: 5, hasSymptoms: true, flagged: true },
  { day: 18, storyContext: "Amara is recovering from the migraine episode two days ago. She feels drained but the headache is gone. Energy is moderate. Stomach cramps are getting better. She is sleeping better, about 7 hours.", expectedMood: "tired", expectedEnergy: 5, expectedSleep: 7, hasSymptoms: false, flagged: false },
  { day: 19, storyContext: "Amara is feeling pretty good today. Her energy is the best it has been in weeks. She managed to do her chores without needing to rest. She mentions she has a doctor appointment next week and wants to bring a report summarizing her health over the past few weeks. Slept 7.5 hours.", expectedMood: "good", expectedEnergy: 7, expectedSleep: 7.5, hasSymptoms: false, flagged: false },
  { day: 21, storyContext: "Amara is preparing for her doctor appointment tomorrow. She wants to make sure the doctor knows about her headaches with visual disturbance, the anemia diagnosis, the iron supplements and stomach cramps, and the breathing episode. She is feeling hopeful. Energy is good. Slept 7 hours.", expectedMood: "hopeful", expectedEnergy: 7, expectedSleep: 7, hasSymptoms: false, flagged: false },
];

// ── Document plans ──
interface DocumentPlan {
  day: number;
  type: string;
  fileName: string;
  content: string;
}

const DOCUMENT_PLANS: DocumentPlan[] = [
  {
    day: 7,
    type: "lab_report",
    fileName: "blood_test_results_mobile_clinic.pdf",
    content: `MOBILE CLINIC BLOOD TEST RESULTS
Patient: Amara Wanjiku
Date: ${getDateForDay(7).toLocaleDateString("en-AU")}
Facility: Kericho Mobile Health Unit

COMPLETE BLOOD COUNT (CBC):
- Hemoglobin: 11.2 g/dL (Reference: 12.0-15.5 g/dL) — LOW
- Hematocrit: 34.1% (Reference: 36-46%) — LOW
- RBC Count: 4.0 x10^12/L (Reference: 4.0-5.5) — Low normal
- MCV: 78 fL (Reference: 80-100 fL) — LOW (microcytic)
- MCH: 26.5 pg (Reference: 27-33 pg) — LOW
- MCHC: 32.8 g/dL (Reference: 32-36 g/dL) — Normal
- WBC: 6.2 x10^9/L (Reference: 4.0-11.0) — Normal
- Platelets: 285 x10^9/L (Reference: 150-400) — Normal

IRON STUDIES:
- Serum Iron: 45 mcg/dL (Reference: 60-170 mcg/dL) — LOW
- Ferritin: 8 ng/mL (Reference: 12-150 ng/mL) — LOW
- TIBC: 420 mcg/dL (Reference: 250-370 mcg/dL) — HIGH
- Transferrin Saturation: 10.7% (Reference: 20-50%) — LOW

INTERPRETATION:
Results consistent with iron deficiency anemia. Recommend iron supplementation (ferrous sulfate 325mg daily) and dietary changes. Follow-up blood test in 8 weeks. If symptoms worsen or no improvement, refer to district hospital.

Clinician: Nurse Mary Achieng, Kericho Mobile Health Unit`,
  },
  {
    day: 14,
    type: "prescription",
    fileName: "pharmacy_prescription_iron.pdf",
    content: `PHARMACY PRESCRIPTION RECORD
Patient: Amara Wanjiku
Date: ${getDateForDay(14).toLocaleDateString("en-AU")}
Pharmacy: Kericho Town Pharmacy

PRESCRIPTION:
1. Ferrous Sulfate 325mg tablets
   - Take 1 tablet daily with food (to reduce stomach upset)
   - Duration: 3 months (90 tablets dispensed)
   - Note: Take with orange juice or vitamin C to improve absorption
   - Avoid taking with tea, coffee, or milk (reduces absorption)

2. Salbutamol Inhaler 100mcg (refill)
   - Use as needed for breathing difficulty
   - 2 puffs as required, maximum 8 puffs per day
   - Remaining from previous prescription: adequate

PHARMACIST NOTES:
- Patient reported stomach cramps with iron tablets taken on empty stomach
- Advised to take with meals to reduce GI side effects
- If stomach issues persist, consider switching to ferrous gluconate (gentler)
- Patient allergic to PENICILLIN — noted in records
- Advised follow-up with clinic in 6-8 weeks for repeat blood test

Dispensed by: Joseph Kibet, Pharmacist`,
  },
];

// ── Utilities ──
function getDateForDay(day: number): Date {
  const now = new Date();
  const baseDate = new Date(now);
  baseDate.setDate(now.getDate() - (21 - day)); // day 21 = today, day 1 = 20 days ago

  // Set to morning EAT (UTC+3) = 7-9am EAT = 4-6am UTC
  const hour = 4 + Math.floor(Math.random() * 2); // 4-5 UTC = 7-8 EAT
  const minute = Math.floor(Math.random() * 60);
  baseDate.setHours(hour, minute, 0, 0);

  return baseDate;
}

async function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

// ── Generate transcript via Mistral ──
async function generateTranscript(plan: DayPlan): Promise<string> {
  const client = mistral as any;
  const response = await client.chat.complete({
    model: "mistral-large-latest",
    messages: [
      {
        role: "system",
        content: `You are generating a realistic voice check-in transcript for a health companion app demo. The speaker is Amara, a 34-year-old woman in rural Kenya. She speaks conversational English with occasional simple phrasing.

Write 2-4 sentences as if Amara is speaking naturally to her AI health companion "Kira" during a morning check-in. Use natural, non-clinical language — the way a real person would describe how they feel. Do NOT use formal medical terminology. Do NOT use a greeting or introduction — just jump straight into how she's feeling.

Context for today: ${plan.storyContext}`,
      },
      {
        role: "user",
        content: `Generate Amara's check-in transcript for day ${plan.day} of her health journey.`,
      },
    ],
  });

  const content = response.choices?.[0]?.message?.content;
  if (!content || typeof content !== "string") {
    throw new Error("Failed to generate transcript");
  }
  return content.trim();
}

// ── Main ──
async function main() {
  console.log("=== Kira Health Companion — Demo Data Seeder ===\n");

  let userId: string;

  if (TARGET_USER_ID) {
    userId = TARGET_USER_ID;
    console.log(`Using specified user: ${userId}`);

    // Verify user exists
    const { data: existing } = await supabase
      .from("profiles")
      .select("id, display_name")
      .eq("id", userId)
      .single();

    if (!existing) {
      console.error(`User ${userId} not found. Exiting.`);
      process.exit(1);
    }
    console.log(`Found user: ${existing.display_name}\n`);
  } else {
    // Find or create demo user
    const { data: existing } = await supabase
      .from("profiles")
      .select("id")
      .eq("email", AMARA_PROFILE.email)
      .single();

    if (existing) {
      userId = existing.id;
      console.log(`Found existing demo user: ${userId}`);
    } else {
      const { data: created, error } = await supabase
        .from("profiles")
        .insert(AMARA_PROFILE)
        .select("id")
        .single();

      if (error || !created) {
        console.error("Failed to create demo user:", error?.message);
        process.exit(1);
      }
      userId = created.id;
      console.log(`Created demo user: ${userId}`);
    }
  }

  // Clean existing data if --clean or if seeding for demo user
  if (CLEAN || !TARGET_USER_ID) {
    console.log("Cleaning existing data for user...");

    // Delete in dependency order
    await supabase.from("symptoms").delete().eq("user_id", userId);
    await supabase.from("document_chunks").delete().in(
      "document_id",
      (await supabase.from("documents").select("id").eq("user_id", userId)).data?.map((d: any) => d.id) || [],
    );
    await supabase.from("documents").delete().eq("user_id", userId);
    await supabase.from("check_ins").delete().eq("user_id", userId);
    await supabase.from("reports").delete().eq("user_id", userId);
    await supabase.from("outbound_calls").delete().eq("user_id", userId);

    console.log("Cleaned.\n");
  }

  // Update profile with Amara's health details if seeding for a specific user
  if (TARGET_USER_ID) {
    await supabase.from("profiles").update({
      conditions: AMARA_PROFILE.conditions,
      allergies: AMARA_PROFILE.allergies,
    }).eq("id", userId);
  }

  // ── Generate check-ins ──
  let checkInCount = 0;
  let symptomCount = 0;

  console.log(`Generating ${CHECKIN_PLANS.length} check-ins...\n`);

  for (const plan of CHECKIN_PLANS) {
    const createdAt = getDateForDay(plan.day);
    console.log(`  Day ${plan.day} (${createdAt.toLocaleDateString()}):`);

    // Generate transcript
    console.log("    Generating transcript...");
    const transcript = await generateTranscript(plan);
    console.log(`    Transcript: "${transcript.slice(0, 80)}..."`);
    await delay(200);

    // Extract structured data
    console.log("    Extracting structured data...");
    const extracted = await extractCheckinData(transcript);
    await delay(200);

    // Embed
    console.log("    Embedding...");
    const embedding = await embedText(extracted.summary);
    await delay(200);

    // Insert check-in
    const { data: checkin, error: ciError } = await supabase
      .from("check_ins")
      .insert({
        user_id: userId,
        input_mode: "text",
        transcript,
        summary: extracted.summary,
        mood: extracted.mood,
        energy: extracted.energy,
        sleep_hours: extracted.sleep_hours,
        notes: extracted.notes,
        flagged: extracted.flagged || plan.flagged,
        flag_reason: extracted.flag_reason,
        embedding,
        created_at: createdAt.toISOString(),
      })
      .select("id")
      .single();

    if (ciError) {
      console.error(`    FAILED to insert check-in: ${ciError.message}`);
      continue;
    }

    checkInCount++;
    console.log(`    Check-in created: ${checkin.id}`);

    // Create symptoms from extracted data if flagged or has symptoms
    if (plan.hasSymptoms && extracted.flagged) {
      // Use the extracted summary to create reasonable symptoms
      const symptomNames: string[] = [];
      const summary = extracted.summary.toLowerCase();

      if (summary.includes("headache") || summary.includes("head")) symptomNames.push("headache");
      if (summary.includes("dizz")) symptomNames.push("dizziness");
      if (summary.includes("fatigue") || summary.includes("tired") || summary.includes("exhausted")) symptomNames.push("fatigue");
      if (summary.includes("stomach") || summary.includes("cramp") || summary.includes("nause")) symptomNames.push("stomach cramps");
      if (summary.includes("breath")) symptomNames.push("breathlessness");
      if (summary.includes("visual") || summary.includes("aura") || summary.includes("zigzag")) symptomNames.push("visual disturbance");

      if (symptomNames.length === 0 && plan.hasSymptoms) {
        symptomNames.push("fatigue"); // fallback
      }

      for (const name of symptomNames) {
        const isCritical = name === "visual disturbance" || name === "breathlessness";
        const severity = isCritical ? 7 : name === "headache" ? 5 : 4;

        const { error: sError } = await supabase.from("symptoms").insert({
          user_id: userId,
          check_in_id: checkin.id,
          name,
          severity,
          body_area: name === "headache" || name === "visual disturbance" ? "head" : name === "breathlessness" ? "chest" : name === "stomach cramps" ? "abdomen" : "general",
          is_critical: isCritical,
          alert_level: isCritical ? "critical" : severity >= 5 ? "warning" : "info",
          alert_message: isCritical ? `${name} reported — please consult a healthcare provider` : null,
          created_at: createdAt.toISOString(),
        });

        if (!sError) {
          symptomCount++;
          console.log(`    Symptom: ${name} (severity: ${severity})`);
        }
      }
    }

    console.log("");
  }

  // ── Generate documents ──
  let documentCount = 0;

  console.log(`\nGenerating ${DOCUMENT_PLANS.length} documents...\n`);

  for (const docPlan of DOCUMENT_PLANS) {
    const createdAt = getDateForDay(docPlan.day);
    console.log(`  ${docPlan.fileName} (day ${docPlan.day}):`);

    // Summarize
    console.log("    Summarizing...");
    const client = mistral as any;
    const summaryResponse = await client.chat.complete({
      model: "mistral-large-latest",
      messages: [
        {
          role: "system",
          content: "You are a medical document summarization assistant. Produce a concise 3-5 sentence summary of this medical document, focusing on key findings, diagnoses, and recommendations. Use simple language.",
        },
        { role: "user", content: docPlan.content },
      ],
    });
    const summary = String(summaryResponse.choices?.[0]?.message?.content || "Document uploaded.").trim();
    await delay(200);

    // Embed
    console.log("    Embedding...");
    const embedding = await embedText(docPlan.content);
    await delay(200);

    // Insert document
    const { data: doc, error: docError } = await supabase
      .from("documents")
      .insert({
        user_id: userId,
        file_name: docPlan.fileName,
        file_url: "", // No actual file for seed data
        file_type: "application/pdf",
        document_type: docPlan.type,
        summary,
        embedding,
        created_at: createdAt.toISOString(),
      })
      .select("id")
      .single();

    if (docError) {
      console.error(`    FAILED to insert document: ${docError.message}`);
      continue;
    }

    documentCount++;
    console.log(`    Document created: ${doc.id}`);

    // Run through chunking pipeline
    console.log("    Running document chunking pipeline...");
    try {
      const chunkCount = await processDocument(doc.id, docPlan.content, docPlan.type);
      console.log(`    Created ${chunkCount} chunks`);
    } catch (err) {
      console.error(`    Chunking failed: ${(err as Error).message}`);
    }

    console.log("");
  }

  // ── Summary ──
  const dateRange = `${getDateForDay(1).toLocaleDateString()} — ${getDateForDay(21).toLocaleDateString()}`;
  console.log("\n=== Seeding Complete ===");
  console.log(`  User ID:    ${userId}`);
  console.log(`  Check-ins:  ${checkInCount}`);
  console.log(`  Symptoms:   ${symptomCount}`);
  console.log(`  Documents:  ${documentCount}`);
  console.log(`  Date range: ${dateRange}`);
  console.log("========================\n");
}

main().catch((err) => {
  console.error("Seed script failed:", err);
  process.exit(1);
});
