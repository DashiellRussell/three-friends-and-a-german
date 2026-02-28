import { Router, Request, Response } from "express";

const router = Router();

// GET /api/checkin
router.get("/", (_req: Request, res: Response) => {
  res.json({ message: "Hello world" });
});

export default router;
