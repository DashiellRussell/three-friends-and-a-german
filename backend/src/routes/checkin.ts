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

const router = Router();

// All checkin routes require authentication
router.use(requireAuth);

// List check-ins for the logged-in user
router.get("/", async (req: Request, res: Response) => {
  const userId = req.userId!;
  const limit = parseInt(req.query.limit as string) || 30;
  const offset = parseInt(req.query.offset as string) || 0;

  const { data, error } = await supabase
    .from("check_ins")
    .select("*, symptoms(*)")
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

  // Step 4: extract + embed + store significant health event chunks (non-blocking)
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
      data: entry as CheckInExtraction,
    };
  });

  const context = await generateConversationContext(mapped);

  res.json({
    context: `${context}\n\nThe user did NOT provide you with this context - this was generated out of his stored data. So do not act as if the user just told you this information, but rather that you already know this about the user as context for your conversation.
          Give just a quick warm opening greeting, then immediately jump into the health check-in conversation. Follow these rules:
- Keep every response to 3-4 sentences maximum
- Follow this agenda in order: energy → mood → sleep hours → any symptoms or notes (optionally food too if it seems relevant)
- Ask only one question at a time
- Once all agenda items are covered, wrap up warmly in one sentence
- Never give medical advice
- Do not engage in small talk or ask questions outside the agenda until the agenda is fully covered`,
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

export default router;
