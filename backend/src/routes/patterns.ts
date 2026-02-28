/**
 * Patterns Route — RAG-powered health pattern detection API
 *
 * Exposes the embedding-based pattern detection service to the frontend.
 * The Trends tab calls GET /api/patterns to display AI Insights cards
 * showing recurring symptom clusters discovered via pgvector similarity search.
 *
 * Flow: Frontend → GET /api/patterns → detectPatterns() → pgvector clustering → Mistral description
 *
 * Results are cached for 1 hour in patternDetection.ts to avoid
 * re-running expensive embedding queries on every page load.
 */

import { Router, Request, Response } from "express";
import { requireAuth } from "../middleware/auth";
import { detectPatterns } from "../services/patternDetection";

const router = Router();
router.use(requireAuth);

// GET /api/patterns — runs the full pattern detection pipeline:
// 1. Fetches last 30 days of check-in embeddings from Supabase
// 2. For each, queries pgvector for nearest neighbors (match_check_ins RPC)
// 3. Clusters via connected-components (similarity >= 0.82, min 3 members)
// 4. Asks Mistral to describe each cluster in natural language
// Returns: { patterns: HealthPattern[] }
router.get("/", async (req: Request, res: Response) => {
  const userId = req.userId!;

  try {
    const patterns = await detectPatterns(userId);
    res.json({ patterns });
  } catch (err) {
    console.error("[patterns] Detection failed:", (err as Error).message);
    res.status(500).json({ error: (err as Error).message });
  }
});

export default router;
