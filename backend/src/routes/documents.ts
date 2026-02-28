import { Router, Request, Response } from "express";
import multer from "multer";
import { supabase } from "../services/supabase";
import { requireAuth } from "../middleware/auth";

const router = Router();
router.use(requireAuth);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB
});

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
router.post("/upload", upload.single("file"), async (req: Request, res: Response) => {
  const userId = req.userId!;
  const file = req.file;

  if (!file) {
    res.status(400).json({ error: "No file provided" });
    return;
  }

  const fileName = `${userId}/${Date.now()}-${file.originalname}`;

  // Upload to Supabase Storage
  const { error: storageError } = await supabase.storage
    .from("medical-documents")
    .upload(fileName, file.buffer, {
      contentType: file.mimetype,
    });

  if (storageError) {
    res.status(500).json({ error: `Storage upload failed: ${storageError.message}` });
    return;
  }

  const { data: urlData } = supabase.storage
    .from("medical-documents")
    .getPublicUrl(fileName);

  // Create document record
  const { data: doc, error: dbError } = await supabase
    .from("documents")
    .insert({
      user_id: userId,
      file_name: file.originalname,
      file_url: urlData.publicUrl,
      file_type: file.mimetype,
      document_type: req.body.document_type || "other",
    })
    .select()
    .single();

  if (dbError) {
    res.status(500).json({ error: dbError.message });
    return;
  }

  // TODO: trigger async Mistral document analysis pipeline
  // - extract text / OCR
  // - generate summary + findings
  // - chunk text and embed for RAG
  // - flag if critical findings

  res.status(201).json(doc);
});

export default router;
