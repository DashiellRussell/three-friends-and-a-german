import { Router, Request, Response } from "express";
import { supabase } from "../services/supabase";
import { requireAuth } from "../middleware/auth";

const router = Router();

// POST /api/profiles/login — simple email login (no auth required)
// Finds profile by email or creates a new one
router.post("/login", async (req: Request, res: Response) => {
  const { email } = req.body;
  if (!email || typeof email !== "string") {
    res.status(400).json({ error: "Email is required" });
    return;
  }

  const normalizedEmail = email.toLowerCase().trim();

  // Try to find existing profile
  const { data: existing, error: findError } = await supabase
    .from("profiles")
    .select("*")
    .eq("email", normalizedEmail)
    .single();

  if (existing) {
    res.json(existing);
    return;
  }

  // Not found — create a new profile
  if (findError && findError.code !== "PGRST116") {
    res.status(500).json({ error: findError.message });
    return;
  }

  const displayName = normalizedEmail.split("@")[0];
  const { data: created, error: createError } = await supabase
    .from("profiles")
    .insert({ email: normalizedEmail, display_name: displayName })
    .select()
    .single();

  if (createError) {
    res.status(500).json({ error: createError.message });
    return;
  }

  res.status(201).json(created);
});

router.use(requireAuth);

// GET /api/profiles — get own profile
router.get("/", async (req: Request, res: Response) => {
  const userId = req.userId!;

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();

  if (error) {
    res.status(error.code === "PGRST116" ? 404 : 500).json({ error: error.message });
    return;
  }
  res.json(data);
});

// PATCH /api/profiles — update own profile
router.patch("/", async (req: Request, res: Response) => {
  const userId = req.userId!;

  const allowed = [
    "display_name", "date_of_birth", "blood_type", "conditions",
    "allergies", "phone_number", "timezone", "emergency_contact",
    "checkin_time", "voice_pref", "language",
  ];
  const updates: Record<string, unknown> = {};
  for (const key of allowed) {
    if (req.body[key] !== undefined) updates[key] = req.body[key];
  }

  if (Object.keys(updates).length === 0) {
    res.status(400).json({ error: "No valid fields to update" });
    return;
  }

  const { data, error } = await supabase
    .from("profiles")
    .update(updates)
    .eq("id", userId)
    .select()
    .single();

  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }
  res.json(data);
});

// POST /api/profiles/onboarding — update onboarding progress
router.post("/onboarding", async (req: Request, res: Response) => {
  const userId = req.userId!;
  const { step, data: onboardingData, completed } = req.body;

  const updates: Record<string, unknown> = {};
  if (step !== undefined) updates.onboarding_step = step;
  if (onboardingData !== undefined) updates.onboarding_data = onboardingData;
  if (completed !== undefined) updates.onboarding_completed = completed;

  // If completing onboarding, also apply any profile fields from onboarding_data
  if (completed && onboardingData) {
    const profileFields = [
      "display_name", "date_of_birth", "blood_type", "conditions",
      "allergies", "phone_number", "timezone", "emergency_contact",
      "checkin_time", "voice_pref", "language",
    ];
    for (const key of profileFields) {
      if (onboardingData[key] !== undefined) updates[key] = onboardingData[key];
    }
  }

  const { data, error } = await supabase
    .from("profiles")
    .update(updates)
    .eq("id", userId)
    .select()
    .single();

  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }
  res.json(data);
});

export default router;
