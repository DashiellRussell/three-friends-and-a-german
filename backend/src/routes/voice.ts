import { Router, Request, Response } from "express";
import { supabase } from "../services/supabase";
import { getSignedUrl, initiateOutboundCall } from "../services/elevenlabs";
import { requireAuth } from "../middleware/auth";

const router = Router();
router.use(requireAuth);

// GET /api/voice/signed-url — get ElevenLabs signed URL for WebRTC voice session
router.get("/signed-url", async (req: Request, res: Response) => {
  const userId = req.userId!;
  const agentId = process.env.ELEVENLABS_AGENT_ID;
  if (!agentId) {
    res.status(500).json({ error: "ELEVENLABS_AGENT_ID not configured" });
    return;
  }

  try {
    // Fetch user profile for dynamic variables
    const { data: profile } = await supabase
      .from("profiles")
      .select("display_name, conditions, allergies, phone_number")
      .eq("id", userId)
      .single();

    const signedUrl = await getSignedUrl(agentId);
    res.json({
      signed_url: signedUrl,
      dynamic_variables: {
        user_name: profile?.display_name || "there",
        conditions: profile?.conditions?.join(", ") || "none listed",
        allergies: profile?.allergies?.join(", ") || "none listed",
      },
    });
  } catch (err) {
    res.status(502).json({ error: (err as Error).message });
  }
});

// POST /api/voice/outbound-call — initiate a proactive health call
router.post("/outbound-call", async (req: Request, res: Response) => {
  const userId = req.userId!;
  const { phone_number, trigger_symptom_id, dynamic_variables } = req.body;

  if (!phone_number) {
    res.status(400).json({ error: "phone_number is required" });
    return;
  }

  try {
    const { conversationId, callSid } = await initiateOutboundCall(
      phone_number,
      dynamic_variables || {},
    );

    // Log the call
    const { data: call, error } = await supabase
      .from("outbound_calls")
      .insert({
        user_id: userId,
        trigger_symptom_id: trigger_symptom_id || null,
        elevenlabs_conversation_id: conversationId,
        twilio_call_sid: callSid,
        status: "initiated",
      })
      .select()
      .single();

    if (error) {
      res.status(207).json({
        conversation_id: conversationId,
        call_sid: callSid,
        db_error: error.message,
      });
      return;
    }

    res.status(201).json(call);
  } catch (err) {
    res.status(502).json({ error: (err as Error).message });
  }
});

// GET /api/voice/calls — list outbound calls
router.get("/calls", async (req: Request, res: Response) => {
  const userId = req.userId!;

  const { data, error } = await supabase
    .from("outbound_calls")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }
  res.json({ calls: data });
});

// PATCH /api/voice/calls/:id — update call status/transcript (webhook callback)
router.patch("/calls/:id", async (req: Request, res: Response) => {
  const userId = req.userId!;
  const { status, transcript, outcome, duration_seconds } = req.body;

  const updates: Record<string, unknown> = {};
  if (status) updates.status = status;
  if (transcript) updates.transcript = transcript;
  if (outcome) updates.outcome = outcome;
  if (duration_seconds) updates.duration_seconds = duration_seconds;

  const { data, error } = await supabase
    .from("outbound_calls")
    .update(updates)
    .eq("id", req.params.id)
    .eq("user_id", userId)
    .select()
    .single();

  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }
  res.json(data);
});

export default router;
