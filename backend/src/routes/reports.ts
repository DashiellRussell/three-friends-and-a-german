import { Router, Request, Response } from "express";
import { supabase } from "../services/supabase";
import { requireAuth } from "../middleware/auth";
import { generateReport } from "../services/generateReport";

const router = Router();
router.use(requireAuth);

// GET /api/reports — list user's reports
router.get("/", async (req: Request, res: Response) => {
  const userId = req.userId!;

  const { data, error } = await supabase
    .from("reports")
    .select("id, date_from, date_to, detail_level, status, content_path, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }
  res.json({ reports: data });
});

// GET /api/reports/generate — generate a new report
router.get("/generate", async (req: Request, res: Response) => {
  const userId = req.userId!;

  try {
    const timeRange = req.query.timeRange as string || "week";
    const detailLevel = req.query.detailLevel as string || "summary";

    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    if (timeRange === "3days") startDate.setDate(startDate.getDate() - 3);
    else if (timeRange === "week") startDate.setDate(startDate.getDate() - 7);
    else if (timeRange === "month") startDate.setMonth(startDate.getMonth() - 1);
    else if (timeRange === "6months") startDate.setMonth(startDate.getMonth() - 6);
    else startDate.setFullYear(2000); // fallback for all time

    const startIso = startDate.toISOString();
    const endIso = endDate.toISOString();

    // Fetch user profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();

    // Fetch check_ins
    const { data: checkIns } = await supabase
      .from("check_ins")
      .select("*")
      .eq("user_id", userId)
      .gte("created_at", startIso)
      .lte("created_at", endIso)
      .order("created_at", { ascending: true });

    // Fetch symptoms
    const { data: symptoms } = await supabase
      .from("symptoms")
      .select("*")
      .eq("user_id", userId)
      .gte("created_at", startIso)
      .lte("created_at", endIso);

    // Fetch documents
    const { data: documents } = await supabase
      .from("documents")
      .select("*")
      .eq("user_id", userId)
      .gte("created_at", startIso)
      .lte("created_at", endIso);

    const doc = await generateReport({
      timeRange: timeRange,
      detailLevel: detailLevel,
      include: {
        checkins: req.query.checkins === "true",
        docs: req.query.docs === "true",
        meds: req.query.meds === "true",
        symptoms: req.query.symptoms === "true",
        trends: req.query.trends === "true",
      },
      profile: profile || null,
      checkIns: checkIns || [],
      symptoms: symptoms || [],
      documents: documents || []
    });

    const pdfBuffer = Buffer.from(doc.output("arraybuffer"));

    // Upload to Supabase Storage
    const fileName = `${userId}/${timeRange}_${Date.now()}.pdf`;
    const { error: uploadError } = await supabase.storage
      .from("reports")
      .upload(fileName, pdfBuffer, {
        contentType: "application/pdf",
        upsert: true,
      });

    if (uploadError) {
      console.error("Failed to upload report to storage:", uploadError);
    }

    // Insert record into reports table
    const { error: dbError } = await supabase
      .from("reports")
      .insert({
        user_id: userId,
        date_from: startDate.toISOString().split('T')[0],
        date_to: endDate.toISOString().split('T')[0],
        detail_level: detailLevel,
        include_sections: {
          checkins: req.query.checkins === "true",
          docs: req.query.docs === "true",
          meds: req.query.meds === "true",
          symptoms: req.query.symptoms === "true",
          trends: req.query.trends === "true",
        },
        content_path: fileName,
        status: "completed",
      });

    if (dbError) {
      console.error("Failed to insert report record:", dbError);
    }

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `inline; filename=report_${timeRange}.pdf`);
    res.send(pdfBuffer);
    return;
  } catch (err: any) {
    console.error("PDF GENERATION ERROR:", err);
    res.status(500).json({ error: err.message, stack: err.stack });
    return;
  }
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
