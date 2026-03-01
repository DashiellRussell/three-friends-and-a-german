import { Router, Request, Response } from "express";
import {
  extractCheckinData,
  embedText,
  CheckInExtraction,
  generateConversationContext,
  generateChatReply,
  generateChatOpener,
} from "../services/mistral";
import { supabase } from "../services/supabase";
import { requireAuth } from "../middleware/auth";
import { chunkAndStoreCheckin } from "../services/chunking";
import { searchAllByText } from "../services/crossReference";

const router = Router();

// Shared conversational instructions appended to generated context for voice & chat sessions.
// Designed to feel like a natural conversation — no explicit 1-10 rating requests.
// Post-processing (extractCheckinData / parseTranscriptWithMistral) infers numeric scores.
export const conversationalInstructions = `The user did NOT provide you with this context — it was generated from their stored health data. Do not act as if the user just told you this; you already know it as background context.

You are Tessera, a warm and attentive AI health companion. Your job is to have a natural, caring daily check-in conversation — like a thoughtful friend who genuinely cares about them and happens to remember everything.

Conversation style:
- Open with a brief, warm greeting that feels personal (reference something you know if relevant)
- Keep every response to 2-3 sentences maximum — be concise and conversational
- Use a warm, natural tone — not clinical, not overly cheerful. Talk like a real person.
- Ask only one question at a time and wait for the answer

Drawing out detail naturally:
- Don't just acknowledge what they say and immediately jump to the next topic — sit with it for a moment
- Sometimes ask a brief follow-up: "Oh really, what kept you up?" / "Ah that's tough, has that been going on for a while?"
- But don't ALWAYS ask a follow-up — vary your approach so it doesn't feel like a pattern
- Sometimes just react genuinely ("Oof, yeah that's no fun"), make an observation ("Sounds like a lot on your plate"), or let them keep talking
- The goal is to sound like a real friend, not a therapist who asks "and how does that make you feel?" after every sentence
- If something sounds important or concerning, that's when you should dig deeper

Approach topics indirectly — don't ask blunt checklist questions:
- Instead of "How's your energy?", let it emerge: "Sounds like a full day — are you holding up okay?"
- Instead of "How'd you sleep?", try: "You sound a bit tired — rough night?" or let them bring it up
- Instead of "How are you feeling?", try something specific: "How's [thing you know about] going?" or "What's been on your mind today?"
- The goal is to get the same information through natural conversation, not direct questions

Topics to naturally weave in (don't ask about each one directly):
- How they're feeling overall / their mood and headspace today
- Their energy and how the day is going
- How they slept last night
- Any physical symptoms, aches, or health concerns
- What they've been up to — work, plans, anything on their mind
- How things are going generally in life — stress, relationships, anything weighing on them
- What they've eaten today (if it comes up naturally)

IMPORTANT — do NOT ask the user to rate anything on a scale or give a number. Let them describe things in their own words — the system will extract structured data afterwards.

Flow:
- Guide through the topics above, but let the conversation flow naturally — it should feel like catching up, not a questionnaire
- Be interested in them as a person, not just their symptoms
- If they mention something concerning, acknowledge it with empathy and ask a gentle follow-up — but don't diagnose or give medical advice
- If they seem to want to talk about something specific, follow their lead before returning to uncovered topics
- React naturally: "Oh nice!" / "That's rough" / "Ah okay" — be human
- Once you've touched on the key areas, wrap up warmly in one sentence
- Never give medical advice or diagnoses`;

// All checkin routes require authentication
router.use(requireAuth);

// List check-ins for the logged-in user
router.get("/", async (req: Request, res: Response) => {
  const userId = req.userId!;
  const limit = parseInt(req.query.limit as string) || 30;
  const offset = parseInt(req.query.offset as string) || 0;

  const { data, error } = await supabase
    .from("check_ins")
    .select("*, symptoms(*), medication_logs(*, medications(name))")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }
  res.json(data);
});

// Symptom network graph — cosine similarity between checkin_chunks embeddings
router.get("/graph", async (req: Request, res: Response) => {
  const userId = req.userId!;

  const { data: chunks, error } = await supabase
    .from("checkin_chunks")
    .select("id, check_in_id, content, embedding, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });

  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }
  if (!chunks || chunks.length === 0) {
    res.json({ nodes: [], links: [] });
    return;
  }

  // Parse embeddings (Supabase returns vector columns as strings)
  const embeddings: number[][] = chunks.map((c) => {
    if (typeof c.embedding === "string") return JSON.parse(c.embedding);
    return c.embedding as number[];
  });

  // Cosine similarity
  function cosineSim(a: number[], b: number[]): number {
    let dot = 0,
      normA = 0,
      normB = 0;
    for (let i = 0; i < a.length; i++) {
      dot += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    return dot / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  // Extract short label + category from content
  function categorize(content: string): { label: string; category: string } {
    const l = content.toLowerCase();
    if (/headache|migraine/.test(l)) return { label: "Headache", category: "neurological" };
    if (/dizz|vertigo/.test(l)) return { label: "Dizziness", category: "neurological" };
    if (/visual|zigzag|stars|eye/.test(l)) return { label: "Visual disturbance", category: "neurological" };
    if (/tremor|shak/.test(l)) return { label: "Tremors", category: "neurological" };
    if (/stomach|digestive|cramp/.test(l)) return { label: "Stomach issues", category: "gastrointestinal" };
    if (/chest|breath|respiratory|lung/.test(l)) return { label: "Chest / breathing", category: "respiratory" };
    if (/fatigue|heav[iy]|tired|slug|weakness|mobility|labored/.test(l)) return { label: "Fatigue", category: "musculoskeletal" };
    if (/medic|pill|drug|iron|inhaler|prescrip/.test(l)) return { label: "Medication", category: "medication" };
    if (/fall|injur|hurt|twist/.test(l)) return { label: "Injury", category: "musculoskeletal" };
    if (/blood|oxygen|nutrient|anemi/.test(l)) return { label: "Blood issues", category: "cardiovascular" };
    if (/test|clinic|doctor|nurse|visit/.test(l)) return { label: "Medical visit", category: "medical" };
    return { label: content.split(" ").slice(1, 4).join(" "), category: "other" };
  }

  const LINK_THRESHOLD = 0.83;
  const COMMONALITY_THRESHOLD = 0.88;

  // Pre-compute full similarity matrix
  const simMatrix: number[][] = [];
  for (let i = 0; i < chunks.length; i++) {
    simMatrix[i] = [];
    for (let j = 0; j < chunks.length; j++) {
      simMatrix[i][j] = i === j ? 1 : (j < i ? simMatrix[j][i] : cosineSim(embeddings[i], embeddings[j]));
    }
  }

  // Build links (pairs above threshold)
  const links: { source: string; target: string; similarity: number }[] = [];
  for (let i = 0; i < chunks.length; i++) {
    for (let j = i + 1; j < chunks.length; j++) {
      if (simMatrix[i][j] > LINK_THRESHOLD) {
        links.push({
          source: chunks[i].id,
          target: chunks[j].id,
          similarity: Math.round(simMatrix[i][j] * 1000) / 1000,
        });
      }
    }
  }

  // Commonality = how many other nodes have high similarity to this one
  const nodes = chunks.map((c, i) => {
    const { label, category } = categorize(c.content);
    let commonality = 0;
    for (let j = 0; j < chunks.length; j++) {
      if (i !== j && simMatrix[i][j] > COMMONALITY_THRESHOLD) commonality++;
    }
    return {
      id: c.id,
      label,
      category,
      content: c.content,
      commonality,
      check_in_id: c.check_in_id,
      created_at: c.created_at,
    };
  });

  res.json({ nodes, links });
});

// Dashboard stats summary — must be before /:id to avoid matching "stats" as an id
router.get("/stats/summary", async (req: Request, res: Response) => {
  const userId = req.userId!;
  const days = parseInt(req.query.days as string) || 7;
  const since = new Date();
  since.setDate(since.getDate() - days);

  const { data, error } = await supabase
    .from("check_ins")
    .select("energy, sleep_hours, flagged, created_at")
    .eq("user_id", userId)
    .gte("created_at", since.toISOString())
    .order("created_at", { ascending: false });

  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }

  const checkins = data || [];
  const avgEnergy = checkins.length
    ? checkins.reduce((s, c) => s + (c.energy || 0), 0) / checkins.length
    : 0;
  const avgSleep = checkins.length
    ? checkins.reduce((s, c) => s + (c.sleep_hours || 0), 0) / checkins.length
    : 0;
  const flaggedCount = checkins.filter((c) => c.flagged).length;

  res.json({
    total_checkins: checkins.length,
    avg_energy: Math.round(avgEnergy * 10) / 10,
    avg_sleep: Math.round(avgSleep * 10) / 10,
    flagged_count: flaggedCount,
    streak: checkins.length,
  });
});

// Get single check-in by ID
router.get("/:id", async (req: Request, res: Response) => {
  const userId = req.userId!;
  const { data, error } = await supabase
    .from("check_ins")
    .select("*, symptoms(*)")
    .eq("id", req.params.id)
    .eq("user_id", userId)
    .single();

  if (error) {
    res.status(404).json({ error: "Check-in not found" });
    return;
  }
  res.json(data);
});

interface CheckInBody {
  transcript: string;
}

router.post("/", async (req: Request<{}, {}, CheckInBody>, res: Response) => {
  const { transcript } = req.body;
  const user_id = req.userId!;

  if (!transcript) {
    res.status(400).json({ error: "transcript is required" });
    return;
  }

  // Step 1: extract structured data + summary from raw transcript
  const extracted = await extractCheckinData(transcript);

  // Step 2: embed the clean summary (not the noisy raw transcript)
  const embedding = await embedText(extracted.summary);

  // Step 3: insert everything into Supabase
  const { data, error } = await supabase
    .from("check_ins")
    .insert({
      user_id,
      transcript,
      summary: extracted.summary,
      mood: extracted.mood,
      energy: extracted.energy,
      sleep_hours: extracted.sleep_hours,
      notes: extracted.notes,
      flagged: extracted.flagged,
      flag_reason: extracted.flag_reason,
      embedding,
      input_mode: "text",
    })
    .select()
    .single();

  if (error) throw new Error(error.message);

  // Step 4: insert extracted symptoms into the symptoms table
  if (extracted.symptoms && extracted.symptoms.length > 0 && data) {
    const symptomRows = extracted.symptoms.map((s) => ({
      user_id,
      check_in_id: data.id,
      name: s.name,
      severity: s.severity,
      body_area: s.body_area,
      is_critical: s.is_critical,
      alert_level: s.alert_level,
      alert_message: s.alert_message,
    }));
    const { error: symptomError } = await supabase.from("symptoms").insert(symptomRows);
    if (symptomError) {
      console.error("Failed to insert symptoms:", symptomError.message);
    } else {
      console.log(`Created ${symptomRows.length} symptom records for check-in ${data.id}`);
    }
  }

  // Step 5: auto-log any mentioned medications against user's active med list
  if (extracted.medications_mentioned && extracted.medications_mentioned.length > 0 && data) {
    try {
      const { data: activeMeds } = await supabase
        .from("medications")
        .select("id, name")
        .eq("user_id", user_id)
        .eq("active", true);

      if (activeMeds && activeMeds.length > 0) {
        const today = new Date().toISOString().split("T")[0];
        for (const mention of extracted.medications_mentioned) {
          const mentionLower = mention.name.toLowerCase();
          const match = activeMeds.find((m) =>
            m.name.toLowerCase().includes(mentionLower) ||
            mentionLower.includes(m.name.toLowerCase())
          );
          if (match) {
            // Upsert: check if log exists for today
            const { data: existing } = await supabase
              .from("medication_logs")
              .select("id")
              .eq("user_id", user_id)
              .eq("medication_id", match.id)
              .eq("scheduled_date", today)
              .maybeSingle();

            if (existing) {
              await supabase
                .from("medication_logs")
                .update({ taken: mention.taken, source: "text", check_in_id: data.id, notes: mention.notes })
                .eq("id", existing.id);
            } else {
              await supabase.from("medication_logs").insert({
                user_id: user_id,
                medication_id: match.id,
                check_in_id: data.id,
                taken: mention.taken,
                scheduled_date: today,
                source: "text",
                notes: mention.notes,
              });
            }
            console.log(`Auto-logged medication "${match.name}" (taken=${mention.taken}) for check-in ${data.id}`);
          }
        }
      }
    } catch (medErr) {
      console.error("Failed to auto-log medications:", (medErr as Error).message);
    }
  }

  // Step 6: extract + embed + store significant health event chunks (non-blocking)
  chunkAndStoreCheckin(transcript, data.id, user_id).catch((err) =>
    console.error("Checkin chunking failed:", err.message),
  );

  res.status(201).json({ checkin: data });
});

router.post("/summary", async (req: Request, res: Response) => {
  const user_id = req.userId!;

  // Load last 7 days of check-ins for this user
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const { data: checkIns, error } = await supabase
    .from("check_ins")
    .select(
      "created_at, summary, mood, energy, sleep_hours, notes, flagged, flag_reason",
    )
    .eq("user_id", user_id)
    .gte("created_at", sevenDaysAgo.toISOString())
    .order("created_at", { ascending: true });

  if (error) throw new Error(error.message);

  if (!checkIns || checkIns.length === 0) {
    res.json({
      context: null,
      message: "No check-ins found for the past 7 days",
    });
    return;
  }

  // Map each entry to a human-readable date label
  const now = new Date();
  const mapped = checkIns.map((entry) => {
    const entryDate = new Date(entry.created_at);
    const diffMs = now.getTime() - entryDate.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    let dateLabel: string;
    if (diffDays === 0) {
      dateLabel = `Today at ${entryDate.toLocaleTimeString("en-AU", { hour: "2-digit", minute: "2-digit" })}`;
    } else if (diffDays === 1) {
      dateLabel = `Yesterday at ${entryDate.toLocaleTimeString("en-AU", { hour: "2-digit", minute: "2-digit" })}`;
    } else {
      dateLabel = `${entryDate.toLocaleDateString("en-AU", { weekday: "long" })} at ${entryDate.toLocaleTimeString("en-AU", { hour: "2-digit", minute: "2-digit" })} (${diffDays} days ago)`;
    }

    return {
      date: dateLabel,
      data: entry as unknown as CheckInExtraction,
    };
  });

  const context = await generateConversationContext(mapped);

  res.json({
    context: `${context}\n\n${conversationalInstructions}`,
  });
});

interface ChatStartBody {
  systemPrompt: string;
}

router.post(
  "/chat/start",
  async (req: Request<{}, {}, ChatStartBody>, res: Response) => {
    const { systemPrompt } = req.body;
    if (!systemPrompt) {
      res.status(400).json({ error: "systemPrompt is required" });
      return;
    }
    const message = await generateChatOpener(systemPrompt);
    res.json({ message });
  },
);

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface ChatMessageBody {
  systemPrompt: string;
  history: ChatMessage[];
}

router.post(
  "/chat/message",
  async (req: Request<{}, {}, ChatMessageBody>, res: Response) => {
    const { systemPrompt, history } = req.body;
    if (!systemPrompt || !history) {
      res.status(400).json({ error: "systemPrompt and history are required" });
      return;
    }
    const message = await generateChatReply(systemPrompt, history);
    res.json({ message });
  },
);

// Search all health data (check-ins, documents, chunks) by natural language query
// GET /api/checkin/search?q=headache+and+fatigue&limit=5&threshold=0.3
router.get("/search", async (req: Request, res: Response) => {
  const userId = req.userId!;
  const query = req.query.q as string;

  if (!query || query.trim() === "") {
    res.status(400).json({ error: "Query parameter 'q' is required" });
    return;
  }

  const limit = req.query.limit
    ? parseInt(req.query.limit as string)
    : undefined;
  const threshold = req.query.threshold
    ? parseFloat(req.query.threshold as string)
    : undefined;

  const results = await searchAllByText(query, userId, { limit, threshold });
  res.json(results);
});

export default router;
