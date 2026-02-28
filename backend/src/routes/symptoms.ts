import { Router, Request, Response } from "express";
import { supabase } from "../services/supabase";
import { requireAuth } from "../middleware/auth";

const router = Router();
router.use(requireAuth);

// GET /api/symptoms — list symptoms, optionally filter to alerts only
router.get("/", async (req: Request, res: Response) => {
  const userId = req.userId!;
  const alertsOnly = req.query.alerts === "true";
  const dismissed = req.query.dismissed === "true";
  const limit = parseInt(req.query.limit as string) || 50;

  let query = supabase
    .from("symptoms")
    .select("*, check_ins(created_at, mood), documents(file_name, document_type)")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (alertsOnly) {
    query = query.eq("is_critical", true);
  }
  if (!dismissed) {
    query = query.eq("dismissed", false);
  }

  const { data, error } = await query;

  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }
  res.json({ symptoms: data });
});

// GET /api/symptoms/alerts — shorthand for active critical alerts
router.get("/alerts", async (req: Request, res: Response) => {
  const userId = req.userId!;

  const { data, error } = await supabase
    .from("symptoms")
    .select("*")
    .eq("user_id", userId)
    .eq("is_critical", true)
    .eq("dismissed", false)
    .order("severity", { ascending: false });

  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }
  res.json({ alerts: data });
});

// PATCH /api/symptoms/:id/dismiss — dismiss an alert
router.patch("/:id/dismiss", async (req: Request, res: Response) => {
  const userId = req.userId!;

  const { data, error } = await supabase
    .from("symptoms")
    .update({ dismissed: true })
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

// GET /api/symptoms/frequency — top symptoms by frequency (for trends)
router.get("/frequency", async (req: Request, res: Response) => {
  const userId = req.userId!;
  const days = parseInt(req.query.days as string) || 30;

  const since = new Date();
  since.setDate(since.getDate() - days);

  const { data, error } = await supabase
    .from("symptoms")
    .select("name, severity")
    .eq("user_id", userId)
    .gte("created_at", since.toISOString());

  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }

  // Aggregate by name
  const freq: Record<string, { count: number; total: number }> = {};
  for (const s of data || []) {
    if (!freq[s.name]) freq[s.name] = { count: 0, total: 0 };
    freq[s.name].count++;
    freq[s.name].total += s.severity || 0;
  }

  const results = Object.entries(freq)
    .map(([name, v]) => ({
      name,
      count: v.count,
      avg_severity: Math.round((v.total / v.count) * 10) / 10,
    }))
    .sort((a, b) => b.count - a.count);

  res.json({ days, symptoms: results });
});

export default router;
