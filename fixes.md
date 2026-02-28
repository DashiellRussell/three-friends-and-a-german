# Outbound Call Agent — RAG Integration Fixes

Two gaps where the outbound call flow is disconnected from the vector intelligence layer.

---

## Fix 1: Add RAG Context to Call Initiation

**File:** `backend/src/routes/voice.ts` — `POST /api/voice/outbound-call` handler (lines 500-596)

**Problem:** Lines 511-552 build `recentHealthSummary` from raw DB queries (last 5 check-ins, last 10 symptoms). No vector search, no document chunks. The outbound agent has zero awareness of uploaded lab results, prescriptions, or imaging reports.

**Compare with:** The WebRTC signed-url endpoint (lines 470-483) already calls `findRelatedContext()` and injects `health_context` as a dynamic variable.

**Fix:** After building `recentHealthSummary` (line 552), add a RAG lookup and merge the results:

```typescript
// After line 552, before building enrichedVariables:

let healthContext = "";
try {
  const related = await findRelatedContext(
    `health concerns for outbound call to ${phone_number}`,
    userId,
    { limit: 5, includeDocuments: true, includeCheckins: true },
  );
  if (related.combinedContext) {
    healthContext = related.combinedContext;
  }
} catch (err) {
  console.error("[voice/outbound-call] RAG context failed (non-blocking):", (err as Error).message);
}

if (healthContext) {
  recentHealthSummary += `\n\nRELEVANT MEDICAL HISTORY:\n${healthContext}`;
}
```

`findRelatedContext` is already imported at line 10. No new imports needed.

---

## Fix 2: Embed Check-ins Created From Outbound Call Transcripts

**File:** `backend/src/routes/voice.ts` — `syncCallFromElevenLabs()` function (lines 141-202)

**Problem:** Lines 165-180 insert a check-in but never call `embedText()`. The `embedding` column stays `NULL`, making this check-in invisible to all future vector searches (`match_check_ins()` skips null embeddings). Pattern detection is also never triggered.

**Compare with:** The regular `POST /api/checkin` route embeds every check-in summary and runs `checkNewCheckinPattern()`.

**Fix:** After the check-in insert (line 180), embed the summary and update the record:

```typescript
// After line 180 (after .single()):

// Embed the check-in so it's searchable via vector similarity
if (checkin) {
  try {
    const { embedText } = await import("../services/mistral");
    const { checkNewCheckinPattern } = await import("../services/patternDetection");

    const embedding = await embedText(parsed.summary);
    await supabase
      .from("check_ins")
      .update({ embedding })
      .eq("id", checkin.id);

    // Fire-and-forget pattern detection
    checkNewCheckinPattern(embedding, userId).catch(() => {});
  } catch (err) {
    console.error(`[sync] Embedding failed for check-in ${checkin.id} (non-blocking):`, (err as Error).message);
  }
}
```

Alternatively, use static imports at the top of the file instead of dynamic imports:

```typescript
// Add to existing imports at top of file:
import { embedText } from "../services/mistral";
import { checkNewCheckinPattern } from "../services/patternDetection";
```

Then simplify the fix to:

```typescript
if (checkin) {
  try {
    const embedding = await embedText(parsed.summary);
    await supabase.from("check_ins").update({ embedding }).eq("id", checkin.id);
    checkNewCheckinPattern(embedding, userId).catch(() => {});
  } catch (err) {
    console.error(`[sync] Embedding failed for check-in ${checkin.id}:`, (err as Error).message);
  }
}
```

---

## Fix 3 (Optional): Same Embedding Gap in Backfill + Webhook

The same missing-embedding issue exists in two other places:

- **Backfill route** (lines 346-361): `POST /api/voice/backfill` creates check-ins from completed calls but never embeds them.
- **Webhook route** (lines 273-280): `POST /api/voice/webhook/call-complete` inserts a bare check-in with no structured extraction and no embedding.

Apply the same `embedText()` + update pattern after each check-in insert in those handlers.

---

## What Each Fix Enables

| Fix | Result |
|-----|--------|
| Fix 1 — RAG in call initiation | Agent can reference lab results during calls: "Your blood work showed low hemoglobin — how have you been feeling?" |
| Fix 2 — Embed call check-ins | Call-generated check-ins become searchable. Future voice sessions, chat, and reports can find what was discussed. |
| Fix 2 — Pattern detection | If a call check-in matches a recurring cluster (e.g., repeated fatigue), the pattern is detected immediately. |
| Fix 3 — Backfill/webhook parity | Historical and webhook-created check-ins also participate in vector search. |
