import { Router, Request, Response } from "express";
import { supabase } from "../services/supabase";

const router = Router();

// Simple in-memory rate limiter: max 200 successful submissions per IP per hour
const rateLimitMap = new Map<string, { count: number; reset: number }>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now > entry.reset) {
    rateLimitMap.set(ip, { count: 0, reset: now + 3600_000 });
    return false;
  }
  return entry.count >= 200;
}

function incrementRateLimit(ip: string) {
  const entry = rateLimitMap.get(ip);
  if (entry) entry.count++;
}

// POST /api/waitlist — public, no auth required
router.post("/", async (req: Request, res: Response): Promise<void> => {
  const { email } = req.body;

  if (!email || typeof email !== "string" || !email.includes("@")) {
    res.status(400).json({ error: "Valid email required" });
    return;
  }

  const ip = (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() || req.ip || "unknown";
  if (checkRateLimit(ip)) {
    res.status(429).json({ error: "Too many requests. Try again later." });
    return;
  }

  try {
    // Upsert — silently succeed on duplicate
    const { error } = await supabase
      .from("waitlist")
      .upsert(
        { email: email.trim().toLowerCase(), source: "landing" },
        { onConflict: "email", ignoreDuplicates: true }
      );

    if (error) {
      console.error("Waitlist insert error:", error);
      res.status(500).json({ error: "Failed to join waitlist" });
      return;
    }

    // Only count successful requests
    incrementRateLimit(ip);
    res.json({ success: true });
  } catch (err) {
    console.error("Waitlist error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
