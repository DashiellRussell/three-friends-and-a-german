import { Router, Request, Response } from "express";
import { supabase } from "../services/supabase";
import {
  getSignedUrl,
  initiateOutboundCall,
  getConversationDetails,
} from "../services/elevenlabs";
import { requireAuth } from "../middleware/auth";

const router = Router();

// POST /api/voice/webhook/call-complete — ElevenLabs webhook when outbound call ends
// No auth required — called by ElevenLabs servers
router.post("/webhook/call-complete", async (req: Request, res: Response) => {
  const { conversation_id, transcript, status, duration_seconds } = req.body;

  if (!conversation_id) {
    res.status(400).json({ error: "conversation_id is required" });
    return;
  }

  try {
    // Find the outbound call record
    const { data: call, error: findErr } = await supabase
      .from("outbound_calls")
      .select("id, user_id")
      .eq("elevenlabs_conversation_id", conversation_id)
      .single();

    if (findErr || !call) {
      res.status(404).json({ error: "Call not found" });
      return;
    }

    // Update the call record
    const updates: Record<string, unknown> = {
      status: status || "completed",
    };
    if (transcript) updates.transcript = transcript;
    if (duration_seconds) updates.duration_seconds = duration_seconds;

    await supabase
      .from("outbound_calls")
      .update(updates)
      .eq("id", call.id);

    // Auto-create a check-in from the call transcript
    if (transcript) {
      await supabase.from("check_ins").insert({
        user_id: call.user_id,
        input_mode: "voice",
        transcript: transcript,
        notes: `Outbound call check-in (auto-saved)`,
      });
    }

    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

router.use(requireAuth);

// POST /api/voice/sync-calls — fetch conversation details from ElevenLabs and update DB
router.post("/sync-calls", async (req: Request, res: Response) => {
  const userId = req.userId!;

  try {
    // Find all calls that haven't been completed yet
    const { data: calls, error: fetchErr } = await supabase
      .from("outbound_calls")
      .select("id, elevenlabs_conversation_id, status")
      .eq("user_id", userId)
      .in("status", ["initiated", "in-progress"]);

    if (fetchErr) {
      res.status(500).json({ error: fetchErr.message });
      return;
    }

    if (!calls || calls.length === 0) {
      res.json({ synced: 0, calls: [] });
      return;
    }

    const results = [];

    for (const call of calls) {
      try {
        const details = await getConversationDetails(
          call.elevenlabs_conversation_id,
        );

        // Build the transcript string from the conversation turns
        let transcriptText: string | null = null;
        if (details.transcript && typeof details.transcript === "string") {
          transcriptText = details.transcript;
        } else if (
          details.transcript &&
          Array.isArray(details.transcript)
        ) {
          // ElevenLabs returns transcript as array of turns
          transcriptText = (
            details.transcript as unknown as Array<{
              role: string;
              message: string;
            }>
          )
            .map(
              (turn) =>
                `${turn.role === "agent" ? "Agent" : "User"}: ${turn.message}`,
            )
            .join("\n");
        }

        const updates: Record<string, unknown> = {
          status:
            details.status === "done" ? "completed" : details.status,
        };
        if (transcriptText) updates.transcript = transcriptText;
        if (details.call_duration_secs)
          updates.duration_seconds = details.call_duration_secs;
        if (details.analysis) {
          updates.outcome = JSON.stringify(details.analysis);
        }

        const { data: updated } = await supabase
          .from("outbound_calls")
          .update(updates)
          .eq("id", call.id)
          .select()
          .single();

        // Auto-create a check-in from the call transcript
        if (transcriptText && updates.status === "completed") {
          await supabase.from("check_ins").insert({
            user_id: userId,
            input_mode: "voice",
            transcript: transcriptText,
            notes: `Outbound call check-in (auto-saved)`,
          });
        }

        results.push({ id: call.id, status: updates.status, updated: true });
      } catch (err) {
        results.push({
          id: call.id,
          error: (err as Error).message,
          updated: false,
        });
      }
    }

    res.json({ synced: results.filter((r) => r.updated).length, calls: results });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

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
