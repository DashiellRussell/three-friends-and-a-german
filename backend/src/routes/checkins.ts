import { Router, Request, Response } from "express";
import { supabase } from "../services/supabase";
import { requireAuth } from "../middleware/auth";

const router = Router();
router.use(requireAuth);

// GET /api/checkins — list check-ins (newest first)
router.get("/", async (req: Request, res: Response) => {
  const userId = req.userId!;
  const limit = parseInt(req.query.limit as string) || 30;
  const offset = parseInt(req.query.offset as string) || 0;

  const { data, error, count } = await supabase
    .from("check_ins")
    .select("*, symptoms(*)", { count: "exact" })
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }
  res.json({ check_ins: data, total: count });
});

// GET /api/checkins/:id — single check-in with symptoms
router.get("/:id", async (req: Request, res: Response) => {
  const userId = req.userId!;

  const { data, error } = await supabase
    .from("check_ins")
    .select("*, symptoms(*)")
    .eq("id", req.params.id)
    .eq("user_id", userId)
    .single();

  if (error) {
    res.status(error.code === "PGRST116" ? 404 : 500).json({ error: error.message });
    return;
  }
  res.json(data);
});

// POST /api/checkins — create a new check-in
router.post("/", async (req: Request, res: Response) => {
  const userId = req.userId!;
  const {
    input_mode, mood, energy, sleep_hours,
    notes, transcript, audio_url, summary,
    flagged, flag_reason, symptoms,
  } = req.body;

  // Insert check-in
  const { data: checkIn, error: checkInError } = await supabase
    .from("check_ins")
    .insert({
      user_id: userId,
      input_mode,
      mood,
      energy,
      sleep_hours,
      notes,
      transcript,
      audio_url,
      summary,
      flagged: flagged || false,
      flag_reason,
    })
    .select()
    .single();

  if (checkInError) {
    res.status(500).json({ error: checkInError.message });
    return;
  }

  // Insert symptoms if provided
  if (symptoms && Array.isArray(symptoms) && symptoms.length > 0) {
    const symptomRows = symptoms.map((s: {
      name: string;
      severity: number;
      body_area?: string;
      is_critical?: boolean;
      alert_level?: string;
      alert_message?: string;
    }) => ({
      user_id: userId,
      check_in_id: checkIn.id,
      name: s.name,
      severity: s.severity,
      body_area: s.body_area,
      is_critical: s.is_critical || false,
      alert_level: s.alert_level,
      alert_message: s.alert_message,
    }));

    const { error: sympError } = await supabase
      .from("symptoms")
      .insert(symptomRows);

    if (sympError) {
      res.status(207).json({ check_in: checkIn, symptoms_error: sympError.message });
      return;
    }
  }

  // Re-fetch with symptoms included
  const { data: full } = await supabase
    .from("check_ins")
    .select("*, symptoms(*)")
    .eq("id", checkIn.id)
    .single();

  res.status(201).json(full);
});

// GET /api/checkins/stats/summary — dashboard stats for a user
router.get("/stats/summary", async (req: Request, res: Response) => {
  const userId = req.userId!;
  const days = parseInt(req.query.days as string) || 7;

  const since = new Date();
  since.setDate(since.getDate() - days);

  const { data, error } = await supabase
    .from("check_ins")
    .select("mood, energy, sleep_hours, flagged, created_at")
    .eq("user_id", userId)
    .gte("created_at", since.toISOString())
    .order("created_at", { ascending: true });

  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }

  const total = data?.length || 0;
  const avgEnergy = total > 0
    ? data!.reduce((sum: number, c: { energy: number }) => sum + (c.energy || 0), 0) / total
    : 0;
  const avgSleep = total > 0
    ? data!.reduce((sum: number, c: { sleep_hours: number }) => sum + (c.sleep_hours || 0), 0) / total
    : 0;
  const flaggedCount = data?.filter((c: { flagged: boolean }) => c.flagged).length || 0;

  res.json({
    days,
    total_checkins: total,
    avg_energy: Math.round(avgEnergy * 10) / 10,
    avg_sleep: Math.round(avgSleep * 10) / 10,
    flagged_count: flaggedCount,
    streak: total,
    entries: data,
  });
});

export default router;
