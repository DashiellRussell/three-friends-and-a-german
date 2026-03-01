/**
 * Demo Data Seed Script — Populates the database with a realistic 21-day health story.
 *
 * Creates a patient persona (Margaret "Maggie" Thornton) with:
 * - 15 check-ins over 3 weeks (visual disturbances → hypertension spike → diabetic workup →
 *   ophthalmologist referral → curtain-vision TIA warning → tailored specialist report)
 * - 2 medical documents (blood test / HbA1c results, GP referral letter to ophthalmologist)
 * - Embeddings for every check-in and document (enabling RAG vector search)
 * - Document chunks for fine-grained retrieval (via documentPipeline.ts)
 *
 * Story arc — designed to showcase every core pitch feature:
 *
 *   PHONE-FIRST PERSONA: Maggie is 72, lives alone, has a landline but no smartphone.
 *   Tessera calls her every morning — she never opens an app.
 *
 *   SEMANTIC CLUSTER (days 1–7): hypertension spike + floaters/flashing lights + diabetes
 *   → embedding similarity search surfaces the BP-vision-diabetes cluster before any single
 *   symptom is severe enough to trigger a standard alert.
 *
 *   WARNING #1 (day 7): pattern detection flags the combined cluster.
 *   WARNING #2 (day 16): single critical event — transient "curtain across vision"
 *   (amaurosis fugax pattern), triggers urgent alert.
 *
 *   TAILORED REPORT (day 21): ophthalmologist appointment tomorrow. Report queries ONLY
 *   vision-related check-ins + BP pattern + HbA1c. Foot tingling excluded.
 *
 * Usage:
 *   npx ts-node src/scripts/seed-demo-data.ts                  # create demo user
 *   npx ts-node src/scripts/seed-demo-data.ts --user-id=UUID   # seed for existing user
 *   npx ts-node src/scripts/seed-demo-data.ts --clean           # clean before seeding
 */

import dotenv from "dotenv";
dotenv.config();

import { supabase } from "../services/supabase";
// extractCheckinData: Mistral structured extraction (transcript → mood/energy/sleep/symptoms)
// embedText: Mistral 1024-dim embedding (powers vector search in RAG)
import { extractCheckinData, embedText } from "../services/mistral";
import { mistral } from "../services/mistral";
import { chunkAndStoreCheckin } from "../services/chunking";
// processDocument: splits documents into chunks, embeds each chunk, stores in document_chunks

// ── CLI Args ──
const args = process.argv.slice(2);
const CLEAN = args.includes("--clean");
const userIdArg = args.find((a) => a.startsWith("--user-id="));
const TARGET_USER_ID = userIdArg ? userIdArg.split("=")[1] : null;

// ── Patient persona ──
// Margaret "Maggie" Thornton — 72-year-old woman, lives alone in a small regional town.
// Has a landline but no smartphone. Tessera calls her every morning at 8am.
// She never opens an app — the phone call IS the interface.
const MARGARET_PROFILE = {
  email: "margaret.demo@Tessera.health",
  display_name: "Margaret Thornton",
  date_of_birth: "1953-04-22",
  gender: "Female",
  blood_type: "A+",
  conditions: [
    "Type 2 diabetes (diagnosed 2011)",
    "hypertension (diagnosed 2015)",
    "mild cataracts (left eye, monitoring)",
  ],
  allergies: ["sulfonamides"],
  phone_number: "+61412345678",
  timezone: "Australia/Sydney",
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
  // ── Week 1: Something is quietly wrong ──
  // Maggie attributes everything to "just getting older".
  // The system is the first to notice a pattern forming.
  {
    day: 1,
    storyContext:
      "Maggie is feeling okay but a bit flat this morning. Slept about 6.5 hours but woke up with a mild headache that's mostly gone now. She mentions she had a couple of floaters in her vision yesterday — little spots drifting across her left eye — but says she's had those before and they usually go away. Blood pressure on her home monitor was a bit high this morning, 158 over 94, but she says it goes up and down. She took her metformin and amlodipine with breakfast as usual.",
    expectedMood: "okay",
    expectedEnergy: 5,
    expectedSleep: 6.5,
    hasSymptoms: true,
    flagged: false,
  },
  {
    day: 2,
    storyContext:
      "Maggie slept a bit better, about 7 hours. Feeling reasonably well this morning. The headache is back though, dull, sitting behind her eyes. She mentions the floaters in her left eye are still there and seem a little more noticeable than usual — she sees them when she looks at a white wall or out the window. She checked her blood pressure again: 162 over 96. She is not particularly alarmed but wonders if she should adjust her medication.",
    expectedMood: "okay",
    expectedEnergy: 5,
    expectedSleep: 7,
    hasSymptoms: true,
    flagged: false,
  },
  {
    day: 3,
    storyContext:
      "Maggie woke up feeling dizzy this morning when she got out of bed — had to hold the wall for a few seconds. She says it passed quickly and she feels fine now. No floaters today so far. Headache is mild. Energy is average. Slept about 6 hours. She mentions she has been a bit more tired in the evenings lately but puts it down to the weather.",
    expectedMood: "okay",
    expectedEnergy: 4,
    expectedSleep: 6,
    hasSymptoms: true,
    flagged: false,
  },
  {
    day: 5,
    storyContext:
      "Maggie is more tired today. She has had a persistent headache all morning, behind her eyes and into her neck. She mentions that last night she noticed a brief episode where her vision in the left eye went a bit blurry at the edges — like looking through foggy glass — for maybe a minute, then cleared. She is a little worried about that. Her home blood pressure reading this morning was 171 over 101, which she says is the highest she has seen in months. She also mentions her feet have felt tingly and a bit numb on and off this week — mainly at night. Slept 5.5 hours.",
    expectedMood: "worried",
    expectedEnergy: 3,
    expectedSleep: 5.5,
    hasSymptoms: true,
    flagged: true,
  },
  {
    day: 7,
    storyContext:
      "Maggie had another dizzy spell yesterday — had to sit down in the kitchen for a few minutes. This morning she noticed flashing lights in the corner of her left eye, like small sparks or camera flashes, for about 30 seconds. She says it was a bit frightening. Her blood pressure is still elevated, 168 over 99. She has a headache again. Feet are still tingling. Slept about 6 hours. She says she has been meaning to call her GP but keeps forgetting. She wonders out loud if all these things are connected.",
    expectedMood: "worried",
    expectedEnergy: 3,
    expectedSleep: 6,
    hasSymptoms: true,
    flagged: true,
    // FLAG #1: Semantic cluster — persistent hypertension (158→162→171→168) +
    // visual disturbances across multiple check-ins (floaters day1,2 + blurry edge day5 +
    // photopsia/flashing lights day7) + T2DM patient = high-priority referral signal.
    // System surfaces: "Recurring visual symptoms combined with sustained BP elevation
    // in a diabetic patient may indicate hypertensive or diabetic retinopathy. We have
    // notified your emergency contact and recommend contacting your GP today."
  },

  // ── Week 2: Daughter gets involved, GP visit, blood tests ──
  {
    day: 8,
    storyContext:
      "Maggie's daughter Sarah received the alert from Tessera yesterday and drove down to take Maggie to the GP this morning. Maggie sounds relieved — slightly embarrassed that everyone got worried, but glad she went. The GP examined her eyes with an ophthalmoscope, was concerned about the floaters and flashing lights in the context of her diabetes and blood pressure, and ordered blood tests including an HbA1c and a fasting lipid panel. He also adjusted her amlodipine dose. The GP is referring her to an ophthalmologist. Maggie is a bit anxious but feels like things are finally being looked at properly. Slept 6.5 hours.",
    expectedMood: "anxious",
    expectedEnergy: 4,
    expectedSleep: 6.5,
    hasSymptoms: false,
    flagged: false,
  },
  {
    day: 9,
    storyContext:
      "Maggie got her blood test results back today — the GP called her. She says her HbA1c is 8.4 percent, which the doctor said is too high and means her blood sugar has not been well controlled for the past few months. Her cholesterol is also a bit elevated. The GP is going to adjust her diabetes medication. Maggie sounds a little deflated but says she understands now why she has been feeling so tired. No new visual symptoms today. Feet still tingling but she is less worried now that the GP knows. Blood pressure was better this morning, 152 over 90 — the new dose might be helping. Slept 7 hours.",
    expectedMood: "okay",
    expectedEnergy: 5,
    expectedSleep: 7,
    hasSymptoms: true,
    flagged: false,
  },
  {
    day: 11,
    storyContext:
      "Maggie received the formal referral letter to see Dr. Priya Nair, ophthalmologist, in two weeks. She sounds more settled today. Energy is slightly better. No floaters or flashing lights this week. Headache is much lighter — she says the new blood pressure dose is definitely helping. She mentions her feet are still tingling especially at night and wonders if that is also from the diabetes. The GP had mentioned neuropathy as a possibility. Slept 7 hours.",
    expectedMood: "okay",
    expectedEnergy: 5,
    expectedSleep: 7,
    hasSymptoms: true,
    flagged: false,
  },
  {
    day: 12,
    storyContext:
      "Maggie is feeling better than she has in a couple of weeks. Energy is up a little. No vision episodes. Blood pressure on the home monitor was 144 over 88 this morning, the best it has been in a while. She is happy about that. She mentions she has started being more careful about her diet — cutting back on bread and rice as the GP suggested. Feet are still a bit tingly but less than earlier in the week. Slept 7.5 hours.",
    expectedMood: "better",
    expectedEnergy: 6,
    expectedSleep: 7.5,
    hasSymptoms: true,
    flagged: false,
  },
  {
    day: 14,
    storyContext:
      "Maggie is having a good day. No headache, no floaters, no flashing lights. Energy is the best it has been all month. She mentions she uploaded the blood test results and the ophthalmologist referral letter to the app with help from her daughter Sarah. She is looking forward to the ophthalmologist appointment in a week. She also mentions she has been taking her metformin more consistently — Sarah set a phone alarm for her. Slept 7.5 hours.",
    expectedMood: "good",
    expectedEnergy: 6,
    expectedSleep: 7.5,
    hasSymptoms: false,
    flagged: false,
  },

  // ── Week 3: Vision mostly stable — then the curtain event ──
  {
    day: 15,
    storyContext:
      "Maggie is feeling well today. She and Sarah had dinner together last night. Energy is good, slept about 7.5 hours. Blood pressure this morning was 141 over 87. No visual disturbances. Feet tingling is mild and mainly just at night now. She is getting ready for the ophthalmologist appointment this week and mentions she hopes the doctor will have a full picture of everything that has been happening with her eyes.",
    expectedMood: "good",
    expectedEnergy: 7,
    expectedSleep: 7.5,
    hasSymptoms: true,
    flagged: false,
  },
  {
    day: 16,
    storyContext:
      "Maggie sounds frightened this morning. Yesterday afternoon she was watching television when suddenly it was like a dark curtain came down across the top half of her left eye's vision — she could not see anything through the top of that eye for about 45 seconds, then it cleared completely. She says it was unlike anything she has experienced before and scared her badly. She also had a brief headache right after. Her blood pressure at home this morning is 166 over 98 — it has gone back up. She did not call emergency services because it cleared and she did not think it was a heart attack. Slept only 4.5 hours because she was frightened and anxious. Feet are tingling.",
    expectedMood: "scared",
    expectedEnergy: 3,
    expectedSleep: 4.5,
    hasSymptoms: true,
    flagged: true,
    // FLAG #2 — CRITICAL: Transient monocular vision loss ("curtain" pattern) is a
    // classic presentation of amaurosis fugax, which can be a warning sign of an
    // impending stroke or central retinal artery occlusion. This is a time-sensitive
    // emergency flag regardless of prior history.
    // System triggers: URGENT ALERT — immediate GP or emergency contact.
    // Also notifies daughter Sarah.
  },
  {
    day: 18,
    storyContext:
      "Maggie went to the emergency department the evening of the curtain episode after Tessera's urgent alert and Sarah's call. The ED doctor ran an ECG and CT scan — no stroke was found. She was told it may have been a TIA warning sign and to urgently follow up with the ophthalmologist and her GP. She is home now and sounds calmer but still a bit shaken. She is resting and her energy is low. No further vision episodes since the curtain. Blood pressure this morning 148 over 91. Slept 7 hours last night — the first proper sleep in days. Feet tingling as usual.",
    expectedMood: "tired",
    expectedEnergy: 4,
    expectedSleep: 7,
    hasSymptoms: true,
    flagged: false,
  },
  {
    day: 19,
    storyContext:
      "Maggie is feeling a little better today. She is relieved nothing was found in the emergency scan but is taking this very seriously now. Her ophthalmologist appointment has been moved up to tomorrow — Sarah called to expedite it given the curtain episode. Energy is moderate. No visual symptoms today. Blood pressure 145 over 88. She mentions she wants to make sure the eye doctor has a complete picture of everything — all the floaters, the flashing lights, the blurry patches, the curtain — and also her blood pressure readings and the diabetes results. She sounds grateful that Tessera has been recording everything.",
    expectedMood: "okay",
    expectedEnergy: 5,
    expectedSleep: 7,
    hasSymptoms: false,
    flagged: false,
  },
  {
    day: 21,
    storyContext:
      "Maggie has her ophthalmologist appointment in a few hours. She sounds calm and prepared. Sarah is driving her. She mentions she wants to bring a clear summary for the doctor — specifically the eye symptoms, her blood pressure pattern over the past three weeks, and the HbA1c result. She mentions she is glad she does not need to try to remember all of this from memory — she says she would have forgotten half of it. Energy is good. Slept 7.5 hours. Blood pressure this morning 143 over 86.",
    expectedMood: "hopeful",
    expectedEnergy: 6,
    expectedSleep: 7.5,
    hasSymptoms: false,
    flagged: false,
  },
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
    day: 9,
    type: "lab_report",
    fileName: "blood_test_results_hba1c_panel.pdf",
    content: `PATHOLOGY REPORT
Patient: Margaret Thornton  
DOB: 22/04/1953
Date Collected: ${getDateForDay(8).toLocaleDateString("en-AU")}
Date Reported: ${getDateForDay(9).toLocaleDateString("en-AU")}
Requesting Physician: Dr. Alan Marsh, Bankstown Medical Centre
Lab: NSW Pathology — Western Sydney

GLYCAEMIC CONTROL:
- HbA1c (Glycated Haemoglobin): 8.4% (Reference: <7.0% for diabetic patients) — HIGH
  Estimated average glucose: 11.0 mmol/L
  Clinical note: HbA1c has increased from 7.6% (12 months ago). Current glycaemic
  control is suboptimal. Consider medication review and dietary reinforcement.

FASTING LIPID PANEL:
- Total Cholesterol: 5.8 mmol/L (Reference: <5.5) — BORDERLINE HIGH
- LDL Cholesterol: 3.6 mmol/L (Reference: <3.5 for T2DM patients) — BORDERLINE HIGH
- HDL Cholesterol: 1.2 mmol/L (Reference: >1.3 for women) — LOW
- Triglycerides: 2.1 mmol/L (Reference: <1.7) — HIGH
- Total Cholesterol/HDL Ratio: 4.8 (Reference: <4.0) — HIGH

RENAL FUNCTION (routine diabetic monitoring):
- eGFR: 61 mL/min/1.73m2 (Reference: >60) — Low normal, monitor
- Urine Albumin/Creatinine Ratio: 3.8 mg/mmol (Reference: <3.5) — BORDERLINE
  Clinical note: Microalbuminuria borderline. Recheck in 3 months. Early indicator
  of diabetic nephropathy — relevant given poorly controlled HbA1c.

COMPLETE BLOOD COUNT:
- Haemoglobin: 13.1 g/dL (Reference: 12.0–15.5) — Normal
- WBC: 7.1 x10^9/L (Reference: 4.0–11.0) — Normal
- Platelets: 240 x10^9/L (Reference: 150–400) — Normal

CLINICAL INTERPRETATION:
Suboptimal glycaemic control (HbA1c 8.4%) in context of T2DM with hypertension.
Elevated triglycerides and borderline LDL increase cardiovascular and microvascular
risk (retinopathy, nephropathy, neuropathy). Recommend: (1) metformin dose review /
addition of SGLT-2 inhibitor, (2) dietary counselling, (3) urgent ophthalmology
referral to evaluate for diabetic retinopathy given patient's visual symptoms,
(4) repeat HbA1c in 3 months.

Reported by: Dr. K. Patel, Clinical Biochemist, NSW Pathology`,
  },
  {
    day: 11,
    type: "referral_letter",
    fileName: "gp_referral_ophthalmologist_dr_nair.pdf",
    content: `SPECIALIST REFERRAL LETTER

From: Dr. Alan Marsh, MBBS FRACGP
      Bankstown Medical Centre
      22 Chapel Road, Bankstown NSW 2200
      Tel: (02) 9790 XXXX

To:   Dr. Priya Nair, FRANZCO
      Sydney Eye Specialists
      Level 3, 275 George St, Sydney NSW 2000

Date: ${getDateForDay(11).toLocaleDateString("en-AU")}

RE: Margaret Thornton, DOB 22/04/1953

Dear Dr. Nair,

Thank you for seeing Mrs. Thornton on a semi-urgent basis. I am referring her for
comprehensive ophthalmological assessment in the context of the following:

PRESENTING CONCERNS:
Mrs. Thornton is a 72-year-old woman with a 12-year history of Type 2 diabetes
mellitus and a 9-year history of hypertension. Over the past 10 days she has
reported the following visual symptoms, progressively:

  - Persistent floaters in the left eye (days 1–7, ongoing)
  - Transient blurring at the peripheral visual field of the left eye (~1 min,
    self-resolving)
  - Photopsia (flashing lights, left eye) — one episode of approximately 30 seconds
  - MOST CONCERNING: one episode of transient monocular vision loss in the left eye
    ("curtain coming down" description) lasting approximately 45 seconds, followed
    by complete resolution. Patient subsequently presented to ED; CT head unremarkable,
    ECG normal, no acute infarct identified.

RELEVANT BACKGROUND:
  - HbA1c: 8.4% (recent result — copy attached). Glycaemic control suboptimal.
  - BP: persistently elevated past 3 weeks (range 158–171/94–101 systolic/diastolic),
    now partially controlled on amended amlodipine dose (146/89 most recent reading).
  - Triglycerides elevated, LDL borderline high.
  - Patient also reporting bilateral distal foot paraesthesia (tingling), worse at night,
    consistent with early peripheral diabetic neuropathy.
  - Known mild cataract left eye (previous optometry report 2022, no intervention).
  - Current medications: Metformin 1000mg BD, Amlodipine 10mg daily,
    Atorvastatin 20mg nocte.
  - Allergies: Sulfonamides.

CLINICAL CONCERN:
The combination of uncontrolled T2DM, sustained hypertension, and progressive
unilateral visual symptoms (floaters, photopsia, transient monocular vision loss)
raises significant concern for diabetic retinopathy, hypertensive retinopathy,
and/or early central retinal vascular pathology. The transient monocular vision
loss episode warrants urgent fundoscopy and angiography to exclude retinal
arterial or venous occlusion.

I would appreciate your assessment and management recommendations.

Yours sincerely,
Dr. Alan Marsh, MBBS FRACGP
Bankstown Medical Centre`,
  },
];

// ── Utilities ──
function getDateForDay(day: number): Date {
  const now = new Date();
  const baseDate = new Date(now);
  baseDate.setDate(now.getDate() - (21 - day)); // day 21 = today, day 1 = 20 days ago

  // Set to morning AEST (UTC+10) = 8am AEST = 10pm UTC previous day
  // Tessera calls Maggie every morning at 8am
  const hour = 22; // 10pm UTC = 8am AEST next day
  const minute = Math.floor(Math.random() * 15); // slight variation: 8:00–8:15am
  baseDate.setHours(hour, minute, 0, 0);

  return baseDate;
}

async function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

// ── Generate transcript via Mistral ──
// Generates a realistic phone call transcript between the Tessera AI and Maggie.
// Maggie is elderly, speaks warmly and conversationally. She doesn't use medical terms.
// She calls the AI "the phone" or "the health line" — she doesn't think of it as an app.
async function generateTranscript(plan: DayPlan): Promise<string> {
  const client = mistral as any;
  const response = await client.chat.complete({
    model: "mistral-large-latest",
    messages: [
      {
        role: "system",
        content: `You are generating a realistic voice transcript for a health companion demo.

The AI health companion (Tessera) calls Margaret "Maggie" Thornton every morning at 8am on her landline. Write ONLY Maggie's side of the call — her spoken response to being asked how she is feeling today. Do NOT include any lines from the AI or any speaker labels.

Maggie is 72, lives alone in regional New South Wales. She speaks in a warm, unhurried, slightly old-fashioned way using plain everyday language — never medical jargon. She might say "funny little spots in my vision" instead of "floaters", or "that heavy feeling behind my eyes" instead of "headache". She is polite and a bit chatty. Write 3–5 natural sentences as if she is speaking aloud.

Context for today's call: ${plan.storyContext}`,
      },
      {
        role: "user",
        content: `Generate the call transcript for day ${plan.day} of Margaret's health journey.`,
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
  console.log("=== Tessera Health Companion — Demo Data Seeder ===\n");
  console.log(
    "Persona: Margaret 'Maggie' Thornton, 72 — regional NSW, landline only.\n",
  );

  let userId: string;

  if (TARGET_USER_ID) {
    userId = TARGET_USER_ID;
    console.log(`Using specified user: ${userId}`);

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
    const { data: existing } = await supabase
      .from("profiles")
      .select("id")
      .eq("email", MARGARET_PROFILE.email)
      .single();

    if (existing) {
      userId = existing.id;
      console.log(`Found existing demo user: ${userId}`);
    } else {
      const { data: created, error } = await supabase
        .from("profiles")
        .insert(MARGARET_PROFILE)
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

    await supabase.from("checkin_chunks").delete().eq("user_id", userId);
    await supabase.from("symptoms").delete().eq("user_id", userId);
    await supabase
      .from("document_chunks")
      .delete()
      .in(
        "document_id",
        (
          await supabase.from("documents").select("id").eq("user_id", userId)
        ).data?.map((d: any) => d.id) || [],
      );
    await supabase.from("documents").delete().eq("user_id", userId);
    await supabase.from("check_ins").delete().eq("user_id", userId);
    await supabase.from("reports").delete().eq("user_id", userId);
    await supabase.from("outbound_calls").delete().eq("user_id", userId);

    console.log("Cleaned.\n");
  }

  if (TARGET_USER_ID) {
    await supabase
      .from("profiles")
      .update({
        conditions: MARGARET_PROFILE.conditions,
        allergies: MARGARET_PROFILE.allergies,
      })
      .eq("id", userId);
  }

  // ── Generate check-ins ──
  let checkInCount = 0;
  let symptomCount = 0;
  let chunkCount = 0;

  console.log(`Generating ${CHECKIN_PLANS.length} check-ins...\n`);

  for (const plan of CHECKIN_PLANS) {
    const createdAt = getDateForDay(plan.day);
    console.log(`  Day ${plan.day} (${createdAt.toLocaleDateString()}):`);

    console.log("    Generating transcript...");
    const transcript = await generateTranscript(plan);
    console.log(`    Transcript: "${transcript.slice(0, 80)}..."`);
    await delay(200);

    // Mistral structured extraction: transcript → mood, energy, sleep, symptoms, flags
    // Retries up to 3 times — Mistral occasionally drops structured output intermittently.
    console.log("    Extracting structured data...");
    let extracted: Awaited<ReturnType<typeof extractCheckinData>> | null = null;
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        extracted = await extractCheckinData(transcript);
        break;
      } catch (err) {
        if (attempt === 3) throw err;
        console.log(`    Extraction attempt ${attempt} failed, retrying...`);
        await delay(1000);
      }
    }
    if (!extracted)
      throw new Error("extractCheckinData failed after 3 attempts");
    await delay(200);

    // Embed the clean summary — powers both pattern detection (clustering similar
    // check-ins) and cross-reference search (e.g. "find all check-ins mentioning
    // vision problems" or "show me BP readings over the past 3 weeks")
    console.log("    Embedding...");
    const embedding = await embedText(extracted.summary);
    await delay(200);

    const { data: checkin, error: ciError } = await supabase
      .from("check_ins")
      .insert({
        user_id: userId,
        input_mode: "voice", // Maggie's check-ins are always phone calls
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

    // Chunk and store significant health events for fine-grained RAG retrieval.
    // These chunks are what power the tailored specialist report on day 21 —
    // the ophthalmology report queries chunks semantically similar to "vision"
    // and "blood pressure" while excluding unrelated entries (e.g. foot tingling).
    console.log("    Extracting checkin chunks...");
    try {
      const chunks = await chunkAndStoreCheckin(transcript, checkin.id, userId);
      chunkCount += chunks.length;
      if (chunks.length > 0) {
        for (const chunk of chunks) {
          console.log(
            `    Chunk ${chunk.chunk_index}: "${chunk.content.slice(0, 70)}..."`,
          );
        }
      } else {
        console.log("    No significant events found (routine check-in).");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`    Chunking failed: ${msg}`);
    }
    await delay(200);

    // Symptoms — only insert for flagged days with symptoms
    if (plan.hasSymptoms && extracted.flagged) {
      const symptomNames: string[] = [];
      const summary = extracted.summary.toLowerCase();

      if (summary.includes("headache") || summary.includes("head"))
        symptomNames.push("headache");
      if (summary.includes("dizz")) symptomNames.push("dizziness");
      if (
        summary.includes("fatigue") ||
        summary.includes("tired") ||
        summary.includes("exhausted")
      )
        symptomNames.push("fatigue");
      if (
        summary.includes("floater") ||
        summary.includes("spot") ||
        summary.includes("vision") ||
        summary.includes("blurr") ||
        summary.includes("visual")
      )
        symptomNames.push("visual disturbance");
      if (summary.includes("flash") || summary.includes("light"))
        symptomNames.push("photopsia");
      if (summary.includes("curtain") || summary.includes("vision loss"))
        symptomNames.push("transient monocular vision loss");
      if (
        summary.includes("tingle") ||
        summary.includes("tingling") ||
        summary.includes("numb") ||
        summary.includes("feet")
      )
        symptomNames.push("peripheral tingling");
      if (
        summary.includes("blood pressure") ||
        summary.includes("bp") ||
        summary.includes("hypertension")
      )
        symptomNames.push("elevated blood pressure");

      if (symptomNames.length === 0 && plan.hasSymptoms) {
        symptomNames.push("fatigue");
      }

      for (const name of symptomNames) {
        // Transient monocular vision loss is the highest-urgency symptom in this story
        const isCritical =
          name === "transient monocular vision loss" || name === "photopsia";

        const severity =
          name === "transient monocular vision loss"
            ? 9
            : name === "photopsia"
              ? 7
              : name === "visual disturbance" ||
                  name === "elevated blood pressure"
                ? 6
                : name === "headache"
                  ? 5
                  : 4;

        const { error: sError } = await supabase.from("symptoms").insert({
          user_id: userId,
          check_in_id: checkin.id,
          name,
          severity,
          body_area:
            name === "transient monocular vision loss" ||
            name === "visual disturbance" ||
            name === "photopsia" ||
            name === "headache"
              ? "head"
              : name === "elevated blood pressure"
                ? "cardiovascular"
                : name === "peripheral tingling"
                  ? "extremities"
                  : "general",
          is_critical: isCritical,
          alert_level: isCritical
            ? "critical"
            : severity >= 6
              ? "warning"
              : "info",
          alert_message: isCritical
            ? `${name} reported — please seek urgent medical attention and contact your GP or emergency services immediately`
            : severity >= 6
              ? `${name} reported — recommend discussing with your GP at your next appointment`
              : null,
          created_at: createdAt.toISOString(),
        });

        if (!sError) {
          symptomCount++;
          console.log(
            `    Symptom: ${name} (severity: ${severity}, critical: ${isCritical})`,
          );
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

    console.log("    Summarising...");
    const client = mistral as any;
    const summaryResponse = await client.chat.complete({
      model: "mistral-large-latest",
      messages: [
        {
          role: "system",
          content:
            "You are a medical document summarisation assistant. Produce a concise 3–5 sentence summary of this medical document, focusing on key findings, diagnoses, and recommendations. Use simple, plain language suitable for a non-specialist.",
        },
        { role: "user", content: docPlan.content },
      ],
    });
    const summary = String(
      summaryResponse.choices?.[0]?.message?.content || "Document uploaded.",
    ).trim();
    await delay(200);

    // Embed the full document text for document-level similarity search.
    // The fine-grained chunk embeddings (created by processDocument) enable
    // section-level matching — e.g. the ophthalmology report query finds the
    // HbA1c and BP sections specifically, not just the document as a whole.
    console.log("    Embedding...");
    const embedding = await embedText(docPlan.content);
    await delay(200);

    const { data: doc, error: docError } = await supabase
      .from("documents")
      .insert({
        user_id: userId,
        file_name: docPlan.fileName,
        file_url: "",
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
    console.log("");
  }

  // ── Summary ──
  const dateRange = `${getDateForDay(1).toLocaleDateString()} — ${getDateForDay(21).toLocaleDateString()}`;
  console.log("\n=== Seeding Complete ===");
  console.log(`  User ID:    ${userId}`);
  console.log(
    `  Persona:    Margaret "Maggie" Thornton (72, regional NSW, landline only)`,
  );
  console.log(`  Check-ins:  ${checkInCount}`);
  console.log(`  Chunks:     ${chunkCount}`);
  console.log(`  Symptoms:   ${symptomCount}`);
  console.log(`  Documents:  ${documentCount}`);
  console.log(`  Date range: ${dateRange}`);
  console.log("\n  Story arc milestones:");
  console.log(
    "    Day  1–3: Floaters, headaches, BP elevated — each symptom mild alone",
  );
  console.log(
    "    Day    5: Blurry peripheral vision, BP 171/101, foot tingling begins",
  );
  console.log(
    "    Day    7: ⚠️  WARNING #1 — Photopsia + hypertension + T2DM cluster flagged",
  );
  console.log(
    "    Day    8: Daughter drives Maggie to GP after alert. Referral ordered.",
  );
  console.log(
    "    Day    9: HbA1c 8.4% confirmed. Blood test document uploaded.",
  );
  console.log("    Day   11: Ophthalmologist referral letter uploaded.");
  console.log(
    "    Day   16: 🚨 WARNING #2 — Transient monocular vision loss ('curtain')",
  );
  console.log(
    "    Day   16: → Patient went to ED. CT clear. TIA workup ongoing.",
  );
  console.log(
    "    Day   21: Ophthalmologist appointment today. Tailored report generated.",
  );
  console.log("========================\n");
}

main().catch((err) => {
  console.error("Seed script failed:", err);
  process.exit(1);
});
