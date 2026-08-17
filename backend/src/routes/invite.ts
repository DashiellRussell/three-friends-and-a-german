import { Router, Request, Response } from "express";
import { requireAuth } from "../middleware/auth";
import { supabase } from "../services/supabase";
import crypto from "crypto";

const router = Router();

function generateCode(): string {
  return crypto.randomBytes(3).toString("hex").toUpperCase().slice(0, 6);
}

// All routes require auth
router.use(requireAuth);

/**
 * POST /api/invite/generate — create invite code
 */
router.post("/generate", async (req: Request, res: Response) => {
  const {
    type = "caretaker",
    target_email,
    relationship_data = {},
    expires_in_hours = 24,
    max_uses = 1,
  } = req.body;

  if (type !== "caretaker") {
    res.status(400).json({ error: "Only 'caretaker' type is supported in MVP" });
    return;
  }

  const code = generateCode();
  const expires_at = new Date(Date.now() + expires_in_hours * 60 * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from("invite_codes")
    .insert({
      code,
      type,
      created_by_profile_id: req.userId!,
      target_email: target_email || null,
      relationship_data,
      expires_at,
      max_uses,
    })
    .select()
    .single();

  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }

  res.status(201).json(data);
});

/**
 * GET /api/invite/:code/info — peek at code details without redeeming
 */
router.get("/:code/info", async (req: Request, res: Response) => {
  const { code } = req.params;

  const { data, error } = await supabase
    .from("invite_codes")
    .select(`
      id, code, type, target_email, relationship_data, expires_at, max_uses, use_count, created_at,
      creator:profiles!invite_codes_created_by_profile_id_fkey (
        display_name, email
      )
    `)
    .eq("code", String(code).toUpperCase())
    .is("redeemed_at", null)
    .single();

  if (error || !data) {
    res.status(404).json({ error: "Invalid or expired invite code" });
    return;
  }

  // Check expiry
  if (new Date(data.expires_at) < new Date()) {
    res.status(410).json({ error: "Invite code has expired" });
    return;
  }

  // Check max uses
  if (data.use_count >= data.max_uses) {
    res.status(410).json({ error: "Invite code has been fully used" });
    return;
  }

  // Check target_email restriction
  if (data.target_email) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("email")
      .eq("id", req.userId!)
      .single();

    if (profile?.email !== data.target_email) {
      res.status(403).json({ error: "This invite code is restricted to a specific email" });
      return;
    }
  }

  res.json(data);
});

/**
 * POST /api/invite/redeem — redeem invite code, creating the relationship
 */
router.post("/redeem", async (req: Request, res: Response) => {
  const { code } = req.body;

  if (!code) {
    res.status(400).json({ error: "code is required" });
    return;
  }

  const { data: invite, error: inviteErr } = await supabase
    .from("invite_codes")
    .select("*")
    .eq("code", String(code).toUpperCase())
    .single();

  if (inviteErr || !invite) {
    res.status(404).json({ error: "Invalid invite code" });
    return;
  }

  // Validate
  if (new Date(invite.expires_at) < new Date()) {
    res.status(410).json({ error: "Invite code has expired" });
    return;
  }

  if (invite.use_count >= invite.max_uses) {
    res.status(410).json({ error: "Invite code has been fully used" });
    return;
  }

  if (invite.target_email) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("email")
      .eq("id", req.userId!)
      .single();

    if (profile?.email !== invite.target_email) {
      res.status(403).json({ error: "This invite code is restricted to a specific email" });
      return;
    }
  }

  if (invite.created_by_profile_id === req.userId) {
    res.status(400).json({ error: "Cannot redeem your own invite code" });
    return;
  }

  // Determine caretaker and patient based on relationship_data
  const relData = invite.relationship_data || {};
  const role = relData.role || "caretaker"; // who is the redeemer?

  let caretaker_id: string;
  let patient_id: string;

  if (role === "patient") {
    // Redeemer is the patient, code creator is the caretaker
    patient_id = req.userId!;
    caretaker_id = invite.created_by_profile_id;
  } else {
    // Redeemer is the caretaker, code creator is the patient
    caretaker_id = req.userId!;
    patient_id = invite.created_by_profile_id;
  }

  const defaultPermissions = {
    view_alerts: true,
    view_checkins: false,
    view_symptoms: false,
    view_medications: false,
    view_documents: false,
    view_reports: false,
    view_trends: false,
    initiate_calls: false,
  };

  const { data: relationship, error: relError } = await supabase
    .from("caretaker_relationships")
    .insert({
      caretaker_id,
      patient_id,
      level: relData.level || "secondary",
      status: "active",
      permissions: relData.permissions || defaultPermissions,
      managed_by: role === "patient" ? "patient" : "caretaker",
      linked_via: "invite_code",
    })
    .select()
    .single();

  if (relError) {
    if (relError.code === "23505") {
      res.status(409).json({ error: "Relationship already exists" });
      return;
    }
    res.status(500).json({ error: relError.message });
    return;
  }

  // Update invite usage
  const isFullyUsed = invite.use_count + 1 >= invite.max_uses;
  await supabase
    .from("invite_codes")
    .update({
      use_count: invite.use_count + 1,
      ...(isFullyUsed ? { redeemed_at: new Date().toISOString() } : {}),
    })
    .eq("id", invite.id);

  // Audit log
  await supabase.from("audit_log").insert({
    actor_type: role === "patient" ? "patient" : "caretaker",
    actor_id: req.userId!,
    action: "relationship_created",
    target_type: "caretaker_relationship",
    target_id: relationship.id,
    details: { linked_via: "invite_code", invite_code: code.toUpperCase() },
  });

  res.status(201).json(relationship);
});

/**
 * GET /api/invite — list my invite codes
 */
router.get("/", async (req: Request, res: Response) => {
  const { data, error } = await supabase
    .from("invite_codes")
    .select("*")
    .eq("created_by_profile_id", req.userId!)
    .order("created_at", { ascending: false });

  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }

  res.json({ invites: data || [] });
});

export default router;
