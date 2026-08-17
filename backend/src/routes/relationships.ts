import { Router, Request, Response } from "express";
import { requireAuth } from "../middleware/auth";
import { supabase } from "../services/supabase";

const router = Router();

// All routes require auth
router.use(requireAuth);

/**
 * GET /api/relationships/caretakers — list my caretakers (as patient)
 */
router.get("/caretakers", async (req: Request, res: Response) => {
  const { data, error } = await supabase
    .from("caretaker_relationships")
    .select(`
      id, level, status, permissions, managed_by, linked_via, created_at, updated_at,
      caretaker:profiles!caretaker_relationships_caretaker_id_fkey (
        id, email, display_name
      )
    `)
    .eq("patient_id", req.userId!)
    .in("status", ["active", "pending"]);

  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }
  res.json({ caretakers: data || [] });
});

/**
 * GET /api/relationships/dependents — list people I care for (as caretaker)
 */
router.get("/dependents", async (req: Request, res: Response) => {
  const { data, error } = await supabase
    .from("caretaker_relationships")
    .select(`
      id, level, status, permissions, managed_by, linked_via, created_at, updated_at,
      patient:profiles!caretaker_relationships_patient_id_fkey (
        id, email, display_name, conditions, allergies
      )
    `)
    .eq("caretaker_id", req.userId!)
    .in("status", ["active", "pending"]);

  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }
  res.json({ dependents: data || [] });
});

/**
 * POST /api/relationships — create relationship directly (caretaker sets up patient)
 */
router.post("/", async (req: Request, res: Response) => {
  const { patient_id, level = "secondary", permissions } = req.body;

  if (!patient_id) {
    res.status(400).json({ error: "patient_id is required" });
    return;
  }

  if (patient_id === req.userId) {
    res.status(400).json({ error: "Cannot create a relationship with yourself" });
    return;
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

  const { data, error } = await supabase
    .from("caretaker_relationships")
    .insert({
      caretaker_id: req.userId!,
      patient_id,
      level,
      status: "active",
      permissions: permissions || defaultPermissions,
      managed_by: "caretaker",
      linked_via: "direct_setup",
    })
    .select()
    .single();

  if (error) {
    if (error.code === "23505") {
      res.status(409).json({ error: "Relationship already exists" });
      return;
    }
    res.status(500).json({ error: error.message });
    return;
  }

  // Audit log
  await supabase.from("audit_log").insert({
    actor_type: "caretaker",
    actor_id: req.userId!,
    action: "relationship_created",
    target_type: "caretaker_relationship",
    target_id: data.id,
    details: { level, linked_via: "direct_setup" },
  });

  res.status(201).json(data);
});

/**
 * PATCH /api/relationships/:id/permissions — update permissions
 */
router.patch("/:id/permissions", async (req: Request, res: Response) => {
  const { id } = req.params;
  const { permissions } = req.body;

  if (!permissions) {
    res.status(400).json({ error: "permissions object is required" });
    return;
  }

  // Verify the requesting user is part of this relationship and has authority
  const { data: rel } = await supabase
    .from("caretaker_relationships")
    .select("*")
    .eq("id", id)
    .single();

  if (!rel) {
    res.status(404).json({ error: "Relationship not found" });
    return;
  }

  const isPatient = rel.patient_id === req.userId;
  const isCaretaker = rel.caretaker_id === req.userId;

  if (!isPatient && !isCaretaker) {
    res.status(403).json({ error: "Not authorized" });
    return;
  }

  // Only the managing party can change permissions
  if (rel.managed_by === "patient" && !isPatient) {
    res.status(403).json({ error: "Patient controls permissions for this relationship" });
    return;
  }
  if (rel.managed_by === "caretaker" && !isCaretaker) {
    res.status(403).json({ error: "Caretaker controls permissions for this relationship" });
    return;
  }

  const oldPermissions = rel.permissions;
  const { data, error } = await supabase
    .from("caretaker_relationships")
    .update({ permissions })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }

  await supabase.from("audit_log").insert({
    actor_type: isPatient ? "patient" : "caretaker",
    actor_id: req.userId!,
    action: "permissions_changed",
    target_type: "caretaker_relationship",
    target_id: id,
    details: { old: oldPermissions, new: permissions },
  });

  res.json(data);
});

/**
 * DELETE /api/relationships/:id — revoke relationship
 */
router.delete("/:id", async (req: Request, res: Response) => {
  const { id } = req.params;

  const { data: rel } = await supabase
    .from("caretaker_relationships")
    .select("*")
    .eq("id", id)
    .single();

  if (!rel) {
    res.status(404).json({ error: "Relationship not found" });
    return;
  }

  if (rel.patient_id !== req.userId && rel.caretaker_id !== req.userId) {
    res.status(403).json({ error: "Not authorized" });
    return;
  }

  const { error } = await supabase
    .from("caretaker_relationships")
    .update({ status: "revoked" })
    .eq("id", id);

  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }

  const isPatient = rel.patient_id === req.userId;
  await supabase.from("audit_log").insert({
    actor_type: isPatient ? "patient" : "caretaker",
    actor_id: req.userId!,
    action: "relationship_revoked",
    target_type: "caretaker_relationship",
    target_id: id,
    details: { revoked_by: isPatient ? "patient" : "caretaker" },
  });

  res.json({ success: true });
});

/**
 * POST /api/relationships/claim — patient claims their account
 */
router.post("/claim", async (req: Request, res: Response) => {
  // Find relationships where this user is the patient and managed_by = 'caretaker'
  const { data: rels, error: relsError } = await supabase
    .from("caretaker_relationships")
    .select("id")
    .eq("patient_id", req.userId!)
    .eq("managed_by", "caretaker")
    .eq("status", "active");

  if (relsError) {
    res.status(500).json({ error: relsError.message });
    return;
  }

  if (!rels || rels.length === 0) {
    res.status(404).json({ error: "No claimable relationships found" });
    return;
  }

  // Flip managed_by to 'patient' for all
  const ids = rels.map((r) => r.id);
  await supabase
    .from("caretaker_relationships")
    .update({ managed_by: "patient" })
    .in("id", ids);

  // Mark profile as claimed
  await supabase
    .from("profiles")
    .update({ account_claimed: true })
    .eq("id", req.userId!);

  for (const r of rels) {
    await supabase.from("audit_log").insert({
      actor_type: "patient",
      actor_id: req.userId!,
      action: "account_claimed",
      target_type: "caretaker_relationship",
      target_id: r.id,
      details: { managed_by_changed: "caretaker -> patient" },
    });
  }

  res.json({ claimed: ids.length });
});

export default router;
