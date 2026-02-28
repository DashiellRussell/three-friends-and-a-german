import { Router, Request, Response } from "express";
import { supabase } from "../services/supabase";
import { mistral } from "../services/mistral";
import {
  getSignedUrl,
  initiateOutboundCall,
  getConversationDetails,
} from "../services/elevenlabs";
import { requireAuth } from "../middleware/auth";
// RAG import: findRelatedContext searches document chunks + check-ins by vector similarity
// Used here to inject relevant medical history into WebRTC voice session dynamic variables
import { findRelatedContext } from "../services/crossReference";

const router = Router();

// ── Helper: build transcript text from ElevenLabs conversation details ──
function buildTranscriptText(transcript: unknown): string | null {
  if (!transcript) return null;
  if (typeof transcript === "string") return transcript;
  if (Array.isArray(transcript)) {
    return (transcript as Array<{ role: string; message: string }>)
      .map((turn) => `${turn.role === "agent" ? "Agent" : "User"}: ${turn.message}`)
      .join("\n");
  }
  return null;
}

// ── Helper: extract duration from ElevenLabs response (multiple possible field names) ──
function extractDuration(details: Record<string, unknown>): number | null {
  // Try known field names
  for (const key of ["call_duration_secs", "duration", "call_duration", "duration_seconds"]) {
    if (typeof details[key] === "number" && details[key] > 0) {
      return details[key] as number;
    }
  }
  // Check nested metadata
  if (details.metadata && typeof details.metadata === "object") {
    const meta = details.metadata as Record<string, unknown>;
    for (const key of ["call_duration_secs", "duration", "call_duration"]) {
      if (typeof meta[key] === "number" && meta[key] > 0) {
        return meta[key] as number;
      }
    }
  }
  return null;
}

// ── Mistral: parse transcript into structured check-in data ──
interface ParsedCheckin {
  mood: string | null;
  energy: number | null;
  sleep_hours: number | null;
  summary: string;
  notes: string;
  flagged: boolean;
  flag_reason: string | null;
  symptoms: Array<{
    name: string;
    severity: number;
    body_area: string | null;
    is_critical: boolean;
    alert_level: "info" | "warning" | "critical";
    alert_message: string | null;
  }>;
}

async function parseTranscriptWithMistral(transcript: string): Promise<ParsedCheckin> {
  const response = await mistral.chat.complete({
    model: "mistral-large-latest",
    responseFormat: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: `You are a medical data extraction assistant. Extract structured health data from a voice check-in transcript between a patient and Kira (an AI health companion).

Return a JSON object with these fields:
{
  "mood": string or null — the patient's mood (e.g., "good", "tired", "anxious", "happy", "stressed", "okay", "down", "great"). Use their own words if possible.
  "energy": number 1-10 or null — energy level if mentioned
  "sleep_hours": number or null — hours of sleep if mentioned
  "summary": string — one sentence summary of the check-in (max 100 chars)
  "notes": string — key points from the patient's responses, written as concise clinical notes
  "flagged": boolean — true if any concerning symptoms or emergency signs
  "flag_reason": string or null — brief reason if flagged
  "symptoms": array of objects, each with:
    - "name": string — symptom name (e.g., "headache", "fatigue", "chest pain")
    - "severity": number 1-10 — estimated severity from context
    - "body_area": string or null — body area (e.g., "head", "chest", "stomach")
    - "is_critical": boolean — true for emergency symptoms
    - "alert_level": "info" | "warning" | "critical"
    - "alert_message": string or null — brief alert text if warning/critical
}

Rules:
- ALWAYS provide a value for mood, energy, and sleep_hours. Never return null for these.
- If the patient explicitly states a value, use it.
- If not explicitly stated, infer from context and tone. For example, if someone sounds stressed, mood might be "stressed" and energy 4.
- If there is truly no indication at all, use reasonable defaults: mood="neutral", energy=5, sleep_hours=7.
- Err on the side of flagging concerning symptoms (false positives > false negatives).
- Critical symptoms: chest pain, difficulty breathing, suicidal ideation, severe allergic reactions, stroke signs.
- Be concise in summary and notes.`,
      },
      {
        role: "user",
        content: `Parse this check-in transcript:\n\n${transcript}`,
      },
    ],
  });

  const content = response.choices?.[0]?.message?.content;
  if (!content || typeof content !== "string") {
    return {
      mood: "neutral", energy: 5, sleep_hours: 7,
      summary: "Check-in recorded",
      notes: transcript.slice(0, 500),
      flagged: false, flag_reason: null, symptoms: [],
    };
  }

  try {
    const parsed = JSON.parse(content) as ParsedCheckin;
    // Ensure no nulls on required fields + clamp to DB constraints
    parsed.mood = parsed.mood || "neutral";
    parsed.energy = Math.max(1, Math.min(10, parsed.energy ?? 5));
    parsed.sleep_hours = Math.max(0, Math.min(24, parsed.sleep_hours ?? 7));
    // Clamp symptom severity too
    parsed.symptoms = (parsed.symptoms || []).map((s) => ({
      ...s,
      severity: Math.max(1, Math.min(10, s.severity ?? 5)),
    }));
    return parsed;
  } catch {
    return {
      mood: "neutral", energy: 5, sleep_hours: 7,
      summary: "Check-in recorded (parse error)",
      notes: transcript.slice(0, 500),
      flagged: false, flag_reason: null, symptoms: [],
    };
  }
}

// ── Helper: update a call record from ElevenLabs conversation details ──
async function syncCallFromElevenLabs(
  callId: string,
  conversationId: string,
  userId: string,
): Promise<{ updated: boolean; status: string }> {
  const details = await getConversationDetails(conversationId);

  const transcriptText = buildTranscriptText(details.transcript);
  const duration = extractDuration(details as unknown as Record<string, unknown>);

  const updates: Record<string, unknown> = {
    status: details.status === "done" ? "completed" : details.status,
  };
  if (transcriptText) updates.transcript = transcriptText;
  if (duration) updates.duration_seconds = Math.round(duration);
  if (details.analysis) updates.outcome = JSON.stringify(details.analysis);

  await supabase.from("outbound_calls").update(updates).eq("id", callId);

  // Parse transcript through Mistral and create a proper check-in + symptoms
  if (transcriptText && updates.status === "completed") {
    console.log(`[sync] Parsing transcript for call ${callId} through Mistral...`);
    const parsed = await parseTranscriptWithMistral(transcriptText);

    const { data: checkin } = await supabase
      .from("check_ins")
      .insert({
        user_id: userId,
        input_mode: "voice",
        transcript: transcriptText,
        mood: parsed.mood,
        energy: parsed.energy,
        sleep_hours: parsed.sleep_hours,
        summary: parsed.summary,
        notes: parsed.notes,
        flagged: parsed.flagged,
        flag_reason: parsed.flag_reason,
      })
      .select("id")
      .single();

    // Create symptom records linked to the check-in
    if (parsed.symptoms.length > 0 && checkin) {
      const symptomRows = parsed.symptoms.map((s) => ({
        user_id: userId,
        check_in_id: checkin.id,
        name: s.name,
        severity: s.severity,
        body_area: s.body_area,
        is_critical: s.is_critical,
        alert_level: s.alert_level,
        alert_message: s.alert_message,
      }));
      await supabase.from("symptoms").insert(symptomRows);
      console.log(`[sync] Created ${symptomRows.length} symptom records for call ${callId}`);
    }

    console.log(`[sync] Check-in created: mood=${parsed.mood}, energy=${parsed.energy}, flagged=${parsed.flagged}`);
  }

  return { updated: true, status: updates.status as string };
}

// ── Background poller: wait for call to finish, then sync ──
function pollCallCompletion(callId: string, conversationId: string, userId: string) {
  const POLL_INTERVAL_MS = 15_000; // check every 15 seconds
  const MAX_POLL_MS = 15 * 60_000; // give up after 15 minutes
  const startTime = Date.now();

  const timer = setInterval(async () => {
    try {
      if (Date.now() - startTime > MAX_POLL_MS) {
        console.log(`[poll] Gave up polling call ${callId} after 15 min`);
        clearInterval(timer);
        return;
      }

      const details = await getConversationDetails(conversationId);

      // Still in progress — keep polling
      if (details.status !== "done" && details.status !== "failed") {
        console.log(`[poll] Call ${callId} status: ${details.status}, waiting...`);
        return;
      }

      // Call finished — sync and stop polling
      console.log(`[poll] Call ${callId} finished (${details.status}), syncing...`);
      clearInterval(timer);
      await syncCallFromElevenLabs(callId, conversationId, userId);
      console.log(`[poll] Call ${callId} synced successfully`);
    } catch (err) {
      console.error(`[poll] Error polling call ${callId}:`, (err as Error).message);
    }
  }, POLL_INTERVAL_MS);
}

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

// POST /api/voice/backfill — sync ALL calls that need processing (admin/dev endpoint)
// Handles: (1) incomplete calls needing ElevenLabs fetch, (2) completed calls with transcript but no parsed check-in
router.post("/backfill", async (req: Request, res: Response) => {
  try {
    const results = [];

    // Phase 1: Fetch from ElevenLabs for calls still initiated/in_progress
    const { data: incompleteCalls } = await supabase
      .from("outbound_calls")
      .select("id, elevenlabs_conversation_id, user_id, status")
      .in("status", ["initiated", "in_progress"]);

    if (incompleteCalls && incompleteCalls.length > 0) {
      console.log(`[backfill] Phase 1: ${incompleteCalls.length} incomplete calls to fetch from ElevenLabs`);
      for (const call of incompleteCalls) {
        if (!call.elevenlabs_conversation_id) {
          results.push({ id: call.id, phase: 1, error: "No conversation ID", updated: false });
          continue;
        }
        try {
          console.log(`[backfill] Syncing call ${call.id}...`);
          const result = await syncCallFromElevenLabs(call.id, call.elevenlabs_conversation_id, call.user_id);
          results.push({ id: call.id, phase: 1, ...result });
        } catch (err) {
          console.error(`[backfill] Failed call ${call.id}:`, (err as Error).message);
          results.push({ id: call.id, phase: 1, error: (err as Error).message, updated: false });
        }
      }
    }

    // Phase 2: Parse completed calls that have transcripts but no corresponding check-in
    const { data: completedCalls } = await supabase
      .from("outbound_calls")
      .select("id, user_id, transcript, elevenlabs_conversation_id")
      .eq("status", "completed")
      .not("transcript", "is", null);

    if (completedCalls && completedCalls.length > 0) {
      // Find which ones already have a check-in created from them
      const unparsed = [];
      for (const call of completedCalls) {
        const { count } = await supabase
          .from("check_ins")
          .select("id", { count: "exact", head: true })
          .eq("user_id", call.user_id)
          .eq("input_mode", "voice")
          .eq("transcript", call.transcript);

        if (!count || count === 0) {
          unparsed.push(call);
        }
      }

      if (unparsed.length > 0) {
        console.log(`[backfill] Phase 2: ${unparsed.length} completed calls need Mistral parsing`);
        for (const call of unparsed) {
          try {
            console.log(`[backfill] Parsing transcript for call ${call.id}...`);
            const parsed = await parseTranscriptWithMistral(call.transcript!);

            const { data: checkin } = await supabase
              .from("check_ins")
              .insert({
                user_id: call.user_id,
                input_mode: "voice",
                transcript: call.transcript,
                mood: parsed.mood,
                energy: parsed.energy,
                sleep_hours: parsed.sleep_hours,
                summary: parsed.summary,
                notes: parsed.notes,
                flagged: parsed.flagged,
                flag_reason: parsed.flag_reason,
              })
              .select("id")
              .single();

            if (parsed.symptoms.length > 0 && checkin) {
              const symptomRows = parsed.symptoms.map((s) => ({
                user_id: call.user_id,
                check_in_id: checkin.id,
                name: s.name,
                severity: s.severity,
                body_area: s.body_area,
                is_critical: s.is_critical,
                alert_level: s.alert_level,
                alert_message: s.alert_message,
              }));
              await supabase.from("symptoms").insert(symptomRows);
              console.log(`[backfill] Created ${symptomRows.length} symptoms for call ${call.id}`);
            }

            console.log(`[backfill] Parsed: mood=${parsed.mood}, energy=${parsed.energy}, flagged=${parsed.flagged}`);
            results.push({ id: call.id, phase: 2, updated: true, status: "parsed" });
          } catch (err) {
            console.error(`[backfill] Parse failed for ${call.id}:`, (err as Error).message);
            results.push({ id: call.id, phase: 2, error: (err as Error).message, updated: false });
          }
        }
      }
    }

    res.json({
      synced: results.filter((r) => r.updated).length,
      failed: results.filter((r) => !r.updated).length,
      calls: results,
    });
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
      if (!call.elevenlabs_conversation_id) {
        results.push({ id: call.id, error: "No conversation ID", updated: false });
        continue;
      }
      try {
        const result = await syncCallFromElevenLabs(
          call.id,
          call.elevenlabs_conversation_id,
          userId,
        );
        results.push({ id: call.id, ...result });
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

    // RAG enrichment for the WebRTC voice session:
    // Search for relevant medical documents and past check-ins using vector similarity.
    // The resulting context string gets passed as a dynamic variable (`health_context`)
    // to the ElevenLabs voice agent, so it can reference specific medical findings
    // during the real-time conversation (e.g., "I see from your blood test that...").
    let healthContext = "";
    try {
      const related = await findRelatedContext(
        `recent health concerns for ${profile?.display_name || "user"}`,
        userId,
        { limit: 3, includeDocuments: true, includeCheckins: true },
      );
      if (related.combinedContext) {
        healthContext = related.combinedContext;
      }
    } catch (err) {
      console.error("[voice/signed-url] RAG context failed (non-blocking):", (err as Error).message);
    }

    const signedUrl = await getSignedUrl(agentId);
    res.json({
      signed_url: signedUrl,
      // Dynamic variables are injected into the ElevenLabs agent's system prompt.
      // health_context contains the RAG-retrieved medical history.
      dynamic_variables: {
        user_name: profile?.display_name || "there",
        conditions: profile?.conditions?.join(", ") || "none listed",
        allergies: profile?.allergies?.join(", ") || "none listed",
        ...(healthContext ? { health_context: healthContext } : {}),
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
    // Fetch recent check-ins for context (last 5)
    const { data: recentCheckins } = await supabase
      .from("check_ins")
      .select("transcript, notes, mood_rating, energy_level, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(5);

    // Fetch recent symptoms (not dismissed)
    const { data: symptoms } = await supabase
      .from("symptoms")
      .select("name, severity, body_area, is_critical, alert_level, alert_message, created_at")
      .eq("user_id", userId)
      .eq("dismissed", false)
      .order("created_at", { ascending: false })
      .limit(10);

    // Build a concise health summary for the agent
    let recentHealthSummary = "";

    if (symptoms && symptoms.length > 0) {
      const symptomLines = symptoms.map(
        (s) => `- ${s.name} (severity: ${s.severity}/10, ${s.body_area || "general"}, ${s.is_critical ? "CRITICAL" : s.alert_level || "info"}, reported: ${new Date(s.created_at).toLocaleDateString()})`,
      );
      recentHealthSummary += `Active symptoms:\n${symptomLines.join("\n")}\n\n`;
    }

    if (recentCheckins && recentCheckins.length > 0) {
      const checkinLines = recentCheckins.map((c) => {
        const date = new Date(c.created_at).toLocaleDateString();
        const parts = [];
        if (c.mood_rating) parts.push(`mood: ${c.mood_rating}/10`);
        if (c.energy_level) parts.push(`energy: ${c.energy_level}/10`);
        if (c.notes) parts.push(c.notes.slice(0, 100));
        return `- ${date}: ${parts.join(", ") || "check-in recorded"}`;
      });
      recentHealthSummary += `Recent check-ins:\n${checkinLines.join("\n")}`;
    }

    if (!recentHealthSummary) {
      recentHealthSummary = "No recent check-ins or symptoms on file. This is a general wellness check-in.";
    }

    // Merge dynamic variables with health context
    const enrichedVariables = {
      ...(dynamic_variables || {}),
      recent_health_summary: recentHealthSummary,
    };

    const { conversationId, callSid } = await initiateOutboundCall(
      phone_number,
      enrichedVariables,
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
      // DB insert failed but call was initiated — still poll
      pollCallCompletion(conversationId, conversationId, userId);
      res.status(207).json({
        conversation_id: conversationId,
        call_sid: callSid,
        db_error: error.message,
      });
      return;
    }

    // Start background polling to auto-sync when call ends
    pollCallCompletion(call.id, conversationId, userId);

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
