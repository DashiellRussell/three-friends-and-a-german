"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const multer_1 = __importDefault(require("multer"));
const supabase_1 = require("../services/supabase");
const auth_1 = require("../middleware/auth");
const mistral_1 = require("../services/mistral");
const DOCUMENT_BUCKET = "uploads";
const router = (0, express_1.Router)();
router.use(auth_1.requireAuth);
const upload = (0, multer_1.default)({ storage: multer_1.default.memoryStorage() });
// GET /api/documents — list user's documents
router.get("/", async (req, res) => {
    const userId = req.userId;
    const limit = parseInt(req.query.limit) || 20;
    const { data, error } = await supabase_1.supabase
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
// GET /api/documents/:id/download — download document via signed URL
router.get("/:id/download", async (req, res) => {
    const userId = req.userId;
    const { data: doc, error } = await supabase_1.supabase
        .from("documents")
        .select("file_url")
        .eq("id", req.params.id)
        .eq("user_id", userId)
        .single();
    if (error) {
        res.status(error.code === "PGRST116" ? 404 : 500).json({ error: error.message });
        return;
    }
    if (!doc.file_url) {
        res.status(404).json({ error: "Document file not available" });
        return;
    }
    // file_url stores the storage path (e.g. "userId/timestamp-filename.pdf")
    const { data: signedUrlData, error: signedUrlError } = await supabase_1.supabase.storage
        .from(DOCUMENT_BUCKET)
        .createSignedUrl(doc.file_url, 3600); // 1 hour expiry
    if (signedUrlError || !signedUrlData?.signedUrl) {
        res.status(500).json({ error: "Failed to generate download URL" });
        return;
    }
    res.json({ url: signedUrlData.signedUrl });
});
// GET /api/documents/:id — single document with full details
router.get("/:id", async (req, res) => {
    const userId = req.userId;
    const { data, error } = await supabase_1.supabase
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
router.post("/upload", upload.single("file"), async (req, res) => {
    const userId = req.userId;
    const { document_text, file_name, document_type } = req.body;
    const file = req.file;
    if (!document_text) {
        res.status(400).json({ error: "document_text is required" });
        return;
    }
    const validTypes = ["lab_report", "prescription", "imaging", "discharge_summary", "other"];
    const docType = validTypes.includes(document_type) ? document_type : "other";
    const fileName = file_name ?? file?.originalname ?? "document.pdf";
    // Upload file to Supabase Storage (private bucket) if a file was provided
    // Store the storage path, not the public URL
    let storagePath = "";
    if (file) {
        storagePath = `${userId}/${Date.now()}-${fileName}`;
        const { error: storageError } = await supabase_1.supabase.storage
            .from(DOCUMENT_BUCKET)
            .upload(storagePath, file.buffer, { contentType: file.mimetype || "application/pdf" });
        if (storageError) {
            res.status(500).json({ error: storageError.message });
            return;
        }
    }
    const [summary, embedding] = await Promise.all([
        (0, mistral_1.summarizeDocument)(document_text),
        (0, mistral_1.embedText)(document_text),
    ]);
    const { data: doc, error: dbError } = await supabase_1.supabase
        .from("documents")
        .insert({
        user_id: userId,
        file_name: fileName,
        file_url: storagePath, // storage path, not a public URL
        file_type: file?.mimetype || "application/pdf",
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
exports.default = router;
