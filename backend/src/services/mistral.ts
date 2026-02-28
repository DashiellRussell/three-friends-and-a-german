import { Mistral } from "@mistralai/mistralai";
import { z } from "zod";

let _client: Mistral;

function getMistral(): Mistral {
  if (!_client) {
    _client = new Mistral({ apiKey: process.env.MISTRAL_API_KEY! });
  }
  return _client;
}

/** Lazy-initialized Mistral client — use for direct API calls */
export const mistral = new Proxy({} as Mistral, {
  get: (_, prop) => getMistral()[prop as keyof Mistral],
});

/**
 * Generate a 1024-dimensional embedding vector for the given text.
 *
 * This is the foundation of the RAG system — every piece of health data
 * (check-in summaries, document chunks, document full-text) gets embedded
 * into the same vector space so we can find semantically similar content
 * via pgvector cosine similarity in Supabase.
 *
 * Used by: checkin creation, document upload, document chunking pipeline,
 * and cross-reference queries (findRelatedContext).
 */
export async function embedText(text: string): Promise<number[]> {
  const result = await getMistral().embeddings.create({
    model: "mistral-embed",
    inputs: [text],
  });

  const embedding = result.data[0].embedding;
  if (!embedding) throw new Error("Mistral returned no embedding");

  return embedding;
}

const CheckInSchema = z.object({
  summary: z.string(),
  mood: z.string().nullable(),
  energy: z.number().int().min(1).max(10).nullable(),
  food: z.string().nullable().optional(),
  sleep_hours: z.number().nullable(),
  notes: z.string().nullable(),
  flagged: z.boolean(),
  flag_reason: z.string().nullable(),
});

export type CheckInExtraction = z.infer<typeof CheckInSchema>;

export async function extractCheckinData(
  transcript: string,
): Promise<CheckInExtraction> {
  const client = getMistral();

  const response = await client.chat.parse({
    model: "mistral-large-latest",
    messages: [
      {
        role: "system",
        content: `You are a health data extraction assistant. Given a voice check-in transcript, extract structured health data.
        
IMPORTANT: The summary field will be sent to a text embedding model (mistral-embed) to power
the RAG vector search system. A good summary produces a good embedding, which means better
pattern detection and cross-referencing with medical documents. Cover the following topics
if mentioned: symptoms, mood, energy levels, food intake, sleep, and any other health-related
observations. Be concise but informative — aim for maximum semantic density.

- summary: 4-6 sentence clean summary of the person's health today
- mood: one word or short phrase e.g. "anxious", "good", "tired", null if not mentioned
- energy: integer 1-10, null if not mentioned
- food: brief description of what they ate today, null if not mentioned
- sleep_hours: number, null if not mentioned
- notes: any additional health observations worth noting, null if none
- flagged: true if any concerning symptoms are mentioned, otherwise false
- flag_reason: reason for flagging, null if not flagged`,
      },
      {
        role: "user",
        content: transcript,
      },
    ],
    responseFormat: CheckInSchema,
  });

  const parsed = response.choices?.[0]?.message?.parsed;
  if (!parsed) throw new Error("Mistral returned no structured output");

  const validated = CheckInSchema.parse(parsed);
  return validated;
}

/**
 * Generate a system prompt for the voice/chat AI based on recent check-in history.
 *
 * RAG enhancement: The optional `relevantContext` parameter receives the output of
 * findRelatedContext() — vector-searched document chunks and past check-ins that are
 * semantically related to the user's recent health state. This context is appended
 * to the prompt so the AI can reference specific lab results, prescriptions, etc.
 * For example: "You know from their recent blood test that hemoglobin was 11.2 g/dL."
 */
export async function generateConversationContext(
  checkIns: { date: string; data: CheckInExtraction }[],
  relevantContext?: string,
): Promise<string> {
  const client = getMistral();

  // If RAG context is available, append it as a clearly labeled block.
  // The instruction tells the AI to weave it naturally into conversation
  // rather than dumping all findings at once.
  const relevantContextBlock = relevantContext
    ? `\n\nRELEVANT HEALTH CONTEXT FROM PATIENT RECORDS:\n${relevantContext}\n\nUse this context naturally in conversation — reference specific past symptoms, document findings, or patterns when relevant. Don't dump all information at once; bring it up when the patient mentions something related.`
    : "";

  const response = await client.chat.complete({
    model: "mistral-large-latest",
    messages: [
      {
        role: "system",
        content: `You are generating a system prompt for a conversational health AI assistant.

Your output will be injected directly as a system prompt into a voice-based AI that is about to start a daily health check-in conversation with the user.

The system prompt you write should:
- Be written in second person, addressing the conversational AI (e.g. "The user has been..." or "You know that...")
- Give the AI enough context to open the conversation naturally and personally, referencing specific recent events (e.g. "You know the user had a headache 3 days ago and was low energy yesterday")
- Use natural relative time references like "this morning", "yesterday", "3 days ago", "last Friday" — never raw dates
- Highlight any patterns, recurring symptoms, or notable changes across the week
- Flag anything concerning so the AI can gently follow up
- If relevant medical documents or past health records are provided, incorporate those findings naturally (e.g. "You know from their recent blood test that...")
- Be concise — this is a system prompt, not an essay. Aim for 150-250 words.
- Do NOT invent information not present in the check-in data or provided context`,
      },
      {
        role: "user",
        content: `Today's date and time: ${new Date().toLocaleString("en-AU", { timeZone: "Australia/Sydney", weekday: "long", year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" })}

Here are the user's check-ins from the past 7 days, from oldest to most recent:

${checkIns
  .map(
    ({ date, data }) => `[${date}]
- Summary: ${data.summary}
- Mood: ${data.mood ?? "not recorded"}
- Energy: ${data.energy ?? "not recorded"}/10
- Sleep: ${data.sleep_hours ?? "not recorded"} hours
- Notes: ${data.notes ?? "none"}
- Flagged: ${data.flagged ? `Yes — ${data.flag_reason}` : "No"}`,
  )
  .join("\n\n")}${relevantContextBlock}

Write a system prompt for the conversational AI that will speak with this user right now.`,
      },
    ],
  });

  const content = response.choices?.[0]?.message?.content;
  if (!content || typeof content !== "string")
    throw new Error("Mistral returned no context summary");

  return content;
}

export const summarizeDocument = async (text: string): Promise<string> => {
  const client = getMistral();

  const response = await client.chat.complete({
    model: "mistral-large-latest",
    messages: [
      {
        role: "system",
        content: `You are a medical document summarization assistant.

Given the full text of a medical document, produce a concise summary that captures the key information a patient would want to remember. Focus on symptoms, diagnoses, treatments, and any follow-up instructions. Write in clear, simple language suitable for a general audience. Aim for 3-5 sentences.`,
      },
      {
        role: "user",
        content: text,
      },
    ],
  });

  const summary = response.choices?.[0]?.message?.content;
  if (!summary || typeof summary !== "string")
    throw new Error("Mistral returned no summary");

  return summary;
};

export async function generateChatOpener(
  systemPrompt: string,
): Promise<string> {
  console.log("Generating chat opener with system prompt:", systemPrompt);
  const client = getMistral();
  const response = await client.chat.complete({
    model: "mistral-large-latest",
    messages: [
      {
        role: "system",
        content: systemPrompt,
      },
      { role: "user", content: "__start__" }, // triggers the AI to speak first
    ],
  });
  const content = response.choices?.[0]?.message?.content;
  if (!content || typeof content !== "string")
    throw new Error("No opener generated");
  return content;
}

export async function generateChatReply(
  systemPrompt: string,
  history: { role: "user" | "assistant"; content: string }[],
): Promise<string> {
  const client = getMistral();
  const response = await client.chat.complete({
    model: "mistral-large-latest",
    messages: [{ role: "system", content: systemPrompt }, ...history],
  });
  const content = response.choices?.[0]?.message?.content;
  if (!content || typeof content !== "string")
    throw new Error("No reply generated");
  return content;
}
