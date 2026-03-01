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
