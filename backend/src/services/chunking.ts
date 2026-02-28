/**
 * Check-in Chunking Service — RAG Component
 *
 * Extracts significant health events from check-in transcripts and stores them
 * as individually embedded chunks for later semantic search.
 *
 * Unlike document chunking (which splits text mechanically), this service uses
 * Mistral to *intelligently* identify only noteworthy health events — things
 * like injuries, new symptoms, medication changes, or unusual occurrences.
 * Routine entries ("slept okay", "mood is fine") are intentionally skipped.
 *
 * Each extracted event is:
 *   1. Summarized into a concise description by Mistral
 *   2. Independently embedded as a 1024-dim vector via mistral-embed
 *   3. Stored in the `checkin_chunks` table for pgvector similarity search
 */

import { z } from "zod";
import { embedText } from "./mistral";
import { supabase } from "./supabase";
import { Mistral } from "@mistralai/mistralai";

// ── Mistral client (same lazy pattern as mistral.ts) ──

let _client: Mistral;

function getMistral(): Mistral {
  if (!_client) {
    _client = new Mistral({ apiKey: process.env.MISTRAL_API_KEY! });
  }
  return _client;
}

// ── Types ──

export interface CheckinChunk {
  content: string;
  chunk_index: number;
}

const SignificantEventsSchema = z.object({
  events: z.array(
    z.object({
      summary: z.string(),
    }),
  ),
});

type SignificantEvents = z.infer<typeof SignificantEventsSchema>;

// ── Step 1: Extract significant events from the transcript via Mistral ──

export async function extractSignificantEvents(
  transcript: string,
): Promise<string[]> {
  const client = getMistral();

  const response = await client.chat.parse({
    model: "mistral-large-latest",
    messages: [
      {
        role: "system",
        content: `You are a health event extraction assistant. Your job is to identify ONLY significant, noteworthy health events from a patient's health conversation transcript.

EXTRACT events like:
- Physical injuries or accidents ("I fell and hurt my leg", "I twisted my ankle")
- New or worsening symptoms ("I've been having chest pain since Tuesday")
- Medication changes or reactions ("I stopped taking my blood pressure meds", "the new pills are making me dizzy")
- Significant emotional or mental health events ("I had a panic attack at work")
- Medical visits, diagnoses, or test results ("the doctor said my blood sugar is too high")
- Unusual or concerning observations ("I noticed blood when I coughed")
- Falls, fainting, or loss of consciousness
- Significant changes in physical ability ("I can't lift my right arm anymore")
- Allergic reactions or new intolerances

DO NOT extract:
- Routine status updates ("I slept well", "mood is okay", "energy is 7/10")
- General feelings without specific events ("feeling a bit tired today")
- Normal daily activities ("went for a walk", "ate breakfast")
- Vague complaints without substance ("not my best day")

For each event, write a concise 1-2 sentence summary that captures WHAT happened, WHEN (if mentioned), and WHERE on the body (if relevant). Write it as a factual third-person statement.

If there are NO significant events in the transcript, return an empty events array. This is completely fine — most routine check-ins won't have noteworthy events.`,
      },
      {
        role: "user",
        content: transcript,
      },
    ],
    responseFormat: SignificantEventsSchema,
  });

  const parsed = response.choices?.[0]?.message?.parsed as
    | SignificantEvents
    | undefined;
  if (!parsed) return [];

  return parsed.events.map((e) => e.summary);
}

// ── Step 2: Embed and store all chunks ──

export async function chunkAndStoreCheckin(
  transcript: string,
  checkInId: string,
  userId: string,
): Promise<CheckinChunk[]> {
  // Step 1: Ask Mistral to extract significant events
  const events = await extractSignificantEvents(transcript);

  // No significant events found — that's fine, nothing to store
  if (events.length === 0) return [];

  // Step 2: Embed each event and build insert rows
  const rows = await Promise.all(
    events.map(async (content, index) => {
      const embedding = await embedText(content);

      return {
        check_in_id: checkInId,
        user_id: userId,
        chunk_index: index,
        content,
        embedding,
        metadata: {
          check_in_id: checkInId,
          chunk_index: index,
          total_chunks: events.length,
        },
      };
    }),
  );

  // Step 3: Insert all chunks into Supabase
  const { error } = await supabase.from("checkin_chunks").insert(rows);

  if (error) {
    console.error("Failed to insert checkin chunks:", error.message);
    throw new Error(`Failed to store checkin chunks: ${error.message}`);
  }

  // Return the chunks for the caller (useful for logging/debugging)
  return events.map((content, index) => ({
    content,
    chunk_index: index,
  }));
}
