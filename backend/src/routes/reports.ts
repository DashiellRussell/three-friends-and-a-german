import { Router, Request, Response } from "express";
import { supabase } from "../services/supabase";
import { requireAuth } from "../middleware/auth";

const router = Router();
router.use(requireAuth);

// GET /api/reports — list user's reports
router.get("/", async (req: Request, res: Response) => {
  const userId = req.userId!;

  const { data, error } = await supabase
    .from("reports")
    .select("id, date_from, date_to, detail_level, status, pdf_url, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }
  res.json({ reports: data });
});

// GET /api/reports/:id — single report with full content
router.get("/:id", async (req: Request, res: Response) => {
  const userId = req.userId!;

  const { data, error } = await supabase
    .from("reports")
    .select("*")
    .eq("id", req.params.id)
    .eq("user_id", userId)
    .single();

  if (error) {
    res.status(error.code === "PGRST116" ? 404 : 500).json({ error: error.message });
    return;
  }
  res.json(data);
});

// POST /api/reports — request a new report generation
router.post("/", async (req: Request, res: Response) => {
  const userId = req.userId!;
  const { date_from, date_to, detail_level, include_sections } = req.body;

  if (!date_from || !date_to) {
    res.status(400).json({ error: "date_from and date_to are required" });
    return;
  }

  // Create report with pending status
  const { data: report, error } = await supabase
    .from("reports")
    .insert({
      user_id: userId,
      date_from,
      date_to,
      detail_level: detail_level || "summary",
      include_sections: include_sections || {
        symptoms: true,
        documents: true,
        trends: true,
      },
      status: "pending",
    })
    .select()
    .single();

  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }

  // TODO: trigger async Mistral report generation pipeline
  // - fetch check-ins + symptoms in date range
  // - fetch documents + findings in date range
  // - RAG retrieval for relevant context
  // - generate report content_json via Mistral
  // - render PDF and upload to storage
  // - update report status to 'completed' with pdf_url

  res.status(201).json(report);
});

export default router;
