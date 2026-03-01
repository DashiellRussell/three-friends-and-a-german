import { Router, Request, Response } from "express";
import { supabase } from "../services/supabase";
import { requireAuth } from "../middleware/auth";

const router = Router();
router.use(requireAuth);

// GET /api/medications — list active medications for user
router.get("/", async (req: Request, res: Response) => {
  const userId = req.userId!;
  const includeInactive = req.query.all === "true";

  let query = supabase
    .from("medications")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });

  if (!includeInactive) {
    query = query.eq("active", true);
  }

  const { data, error } = await query;
  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }
  res.json({ medications: data });
});

// GET /api/medications/today — today's medications with log status
router.get("/today", async (req: Request, res: Response) => {
  const userId = req.userId!;
  const today = new Date().toISOString().split("T")[0];

  // Fetch active medications
  const { data: meds, error: medsErr } = await supabase
    .from("medications")
    .select("id, name, dosage, time_of_day, frequency")
    .eq("user_id", userId)
    .eq("active", true)
    .order("time_of_day", { ascending: true });

  if (medsErr) {
    res.status(500).json({ error: medsErr.message });
    return;
  }

  if (!meds || meds.length === 0) {
    res.json({ medications: [] });
    return;
  }

  // Fetch today's logs
  const { data: logs, error: logsErr } = await supabase
    .from("medication_logs")
    .select("id, medication_id, taken")
    .eq("user_id", userId)
    .eq("scheduled_date", today);

  if (logsErr) {
    res.status(500).json({ error: logsErr.message });
    return;
  }

  const logMap = new Map((logs || []).map((l) => [l.medication_id, l]));

  const result = meds.map((med) => {
    const log = logMap.get(med.id);
    return {
      id: med.id,
      name: med.name,
      dosage: med.dosage,
      time_of_day: med.time_of_day,
      taken: log?.taken ?? false,
      log_id: log?.id ?? null,
    };
  });

  res.json({ medications: result });
});

// GET /api/medications/adherence — adherence stats over N days
router.get("/adherence", async (req: Request, res: Response) => {
  const userId = req.userId!;
  const days = parseInt(req.query.days as string) || 30;

  const since = new Date();
  since.setDate(since.getDate() - days);
  const sinceDate = since.toISOString().split("T")[0];

  // Fetch active medications
  const { data: meds, error: medsErr } = await supabase
    .from("medications")
    .select("id, name")
    .eq("user_id", userId)
    .eq("active", true);

  if (medsErr) {
    res.status(500).json({ error: medsErr.message });
    return;
  }

  if (!meds || meds.length === 0) {
    res.json({ overall_pct: 0, per_medication: [], days });
    return;
  }

  // Fetch logs in range
  const { data: logs, error: logsErr } = await supabase
    .from("medication_logs")
    .select("medication_id, taken")
    .eq("user_id", userId)
    .gte("scheduled_date", sinceDate);

  if (logsErr) {
    res.status(500).json({ error: logsErr.message });
    return;
  }

  const logsByMed = new Map<string, { taken: number; total: number }>();
  for (const med of meds) {
    logsByMed.set(med.id, { taken: 0, total: 0 });
  }
  for (const log of logs || []) {
    const entry = logsByMed.get(log.medication_id);
    if (entry) {
      entry.total++;
      if (log.taken) entry.taken++;
    }
  }

  const totalExpected = meds.length * days;
  let totalTaken = 0;

  const per_medication = meds.map((med) => {
    const entry = logsByMed.get(med.id)!;
    totalTaken += entry.taken;
    const pct = days > 0 ? Math.round((entry.taken / days) * 100) : 0;
    return { name: med.name, pct: Math.min(pct, 100) };
  });

  const overall_pct = totalExpected > 0
    ? Math.min(Math.round((totalTaken / totalExpected) * 100), 100)
    : 0;

  res.json({ overall_pct, per_medication, days });
});

// POST /api/medications — add a new medication
router.post("/", async (req: Request, res: Response) => {
  const userId = req.userId!;
  const { name, dosage, frequency, time_of_day, instructions } = req.body;

  if (!name) {
    res.status(400).json({ error: "name is required" });
    return;
  }

  const { data, error } = await supabase
    .from("medications")
    .insert({
      user_id: userId,
      name,
      dosage: dosage || null,
      frequency: frequency || "daily",
      time_of_day: time_of_day || null,
      instructions: instructions || null,
    })
    .select()
    .single();

  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }
  res.status(201).json(data);
});

// PATCH /api/medications/:id — edit medication fields
router.patch("/:id", async (req: Request, res: Response) => {
  const userId = req.userId!;
  const { name, dosage, frequency, time_of_day, instructions, active } = req.body;

  const updates: Record<string, unknown> = {};
  if (name !== undefined) updates.name = name;
  if (dosage !== undefined) updates.dosage = dosage;
  if (frequency !== undefined) updates.frequency = frequency;
  if (time_of_day !== undefined) updates.time_of_day = time_of_day;
  if (instructions !== undefined) updates.instructions = instructions;
  if (active !== undefined) updates.active = active;

  const { data, error } = await supabase
    .from("medications")
    .update(updates)
    .eq("id", req.params.id)
    .eq("user_id", userId)
    .select()
    .single();

  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }
  res.json(data);
});

// DELETE /api/medications/:id — soft-delete (set active=false)
router.delete("/:id", async (req: Request, res: Response) => {
  const userId = req.userId!;

  const { data, error } = await supabase
    .from("medications")
    .update({ active: false })
    .eq("id", req.params.id)
    .eq("user_id", userId)
    .select()
    .single();

  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }
  res.json(data);
});

// POST /api/medications/:id/log — log taken/missed today (upsert)
router.post("/:id/log", async (req: Request, res: Response) => {
  const userId = req.userId!;
  const medicationId = req.params.id;
  const { taken } = req.body;
  const today = new Date().toISOString().split("T")[0];

  if (typeof taken !== "boolean") {
    res.status(400).json({ error: "taken (boolean) is required" });
    return;
  }

  // Upsert: insert or update based on unique (user_id, medication_id, scheduled_date)
  const { data: existing } = await supabase
    .from("medication_logs")
    .select("id")
    .eq("user_id", userId)
    .eq("medication_id", medicationId)
    .eq("scheduled_date", today)
    .maybeSingle();

  if (existing) {
    const { data, error } = await supabase
      .from("medication_logs")
      .update({ taken, logged_at: new Date().toISOString(), source: "manual" })
      .eq("id", existing.id)
      .select()
      .single();

    if (error) {
      res.status(500).json({ error: error.message });
      return;
    }
    res.json(data);
  } else {
    const { data, error } = await supabase
      .from("medication_logs")
      .insert({
        user_id: userId,
        medication_id: medicationId,
        taken,
        scheduled_date: today,
        source: "manual",
      })
      .select()
      .single();

    if (error) {
      res.status(500).json({ error: error.message });
      return;
    }
    res.status(201).json(data);
  }
});

export default router;
