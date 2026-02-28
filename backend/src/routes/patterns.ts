import { Router, Request, Response } from "express";
import { requireAuth } from "../middleware/auth";
import { detectPatterns } from "../services/patternDetection";

const router = Router();
router.use(requireAuth);

// GET /api/patterns — detect health patterns for the authenticated user
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
