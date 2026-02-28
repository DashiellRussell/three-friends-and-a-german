import { Router, Request, Response } from "express";
import { extractCheckinData, embedText } from "../services/mistral";
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

export default router;
