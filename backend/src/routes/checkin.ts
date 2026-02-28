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

const router = Router();

interface CheckInBody {
  transcript: string;
  user_id: string;
}

router.post("/", async (req: Request<{}, {}, CheckInBody>, res: Response) => {
  const { transcript, user_id } = req.body;

  if (!transcript || !user_id) {
    res.status(400).json({ error: "transcript and user_id are required" });
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

  res.status(201).json({ checkin: data });
});

router.post(
  "/summary",
  async (req: Request<{}, {}, { user_id: string }>, res: Response) => {
    const { user_id } = req.body;

    if (!user_id) {
      res.status(400).json({ error: "user_id is required" });
      return;
    }

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
  },
);

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
