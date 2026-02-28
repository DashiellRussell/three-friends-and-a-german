import { Router, Request, Response } from "express";
import { supabase } from "../services/supabase";
import { requireAuth } from "../middleware/auth";
import { summarizeDocument, embedText } from "../services/mistral";

const router = Router();
router.use(requireAuth);

// GET /api/documents — list user's documents
router.get("/", async (req: Request, res: Response) => {
  const userId = req.userId!;
  const limit = parseInt(req.query.limit as string) || 20;

  const { data, error } = await supabase
    .from("documents")
    .select("id, file_name, file_type, document_type, summary, findings, flagged, flag_reason, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }
  res.json({ documents: data });
});

// GET /api/documents/:id — single document with full details
router.get("/:id", async (req: Request, res: Response) => {
  const userId = req.userId!;

  const { data, error } = await supabase
    .from("documents")
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

// POST /api/documents/upload — upload a medical document
router.post("/upload", async (req: Request, res: Response) => {
  const userId = req.userId!;
  const { document_text, file_name, document_type } = req.body;

  if (!document_text) {
    res.status(400).json({ error: "document_text is required" });
    return;
  }

  const validTypes = ["lab_report", "prescription", "imaging", "discharge_summary", "other"];
  const docType = validTypes.includes(document_type) ? document_type : "other";

  const [summary, embedding] = await Promise.all([
    summarizeDocument(document_text),
    embedText(document_text),
  ]);

  const { data: doc, error: dbError } = await supabase
    .from("documents")
    .insert({
      user_id: userId,
      file_name: file_name ?? "document.pdf",
      file_url: "",
      file_type: "application/pdf",
      document_type: docType,
      summary,
      embedding,
    })
    .select()
    .single();

  if (dbError) {
    res.status(500).json({ error: dbError.message });
    return;
  }

  res.status(201).json(doc);
});

export default router;
