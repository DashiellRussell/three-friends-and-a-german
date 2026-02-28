/**
 * Cross-Reference Service — RAG Retrieval Layer
 *
 * This is the core RAG (Retrieval-Augmented Generation) search function.
 * Given a natural language query, it:
 *   1. Embeds the query text into a 1024-dim vector via Mistral
 *   2. Searches both document_chunks AND check_ins tables using pgvector cosine similarity
 *   3. Merges and formats the results into a text block ready for LLM injection
 *
 * The output (`combinedContext`) is a chronologically sorted, human-readable string
 * that gets injected into system prompts across the app:
 *   - Voice check-in sessions (signed-url endpoint)
 *   - Chat conversations (chat/start, chat/message endpoints)
 *   - Conversation context generation (summary endpoint)
 *   - Report generation (executive summary prompt)
 *
 * This means the AI can reference specific lab results, past symptoms, and document
 * findings naturally in conversation: "Your blood test from last week showed low
 * hemoglobin — how's your energy been since then?"
 */

import { embedText } from "./mistral";
import { supabase } from "./supabase";

interface DocumentChunkResult {
  content: string;
  document_type: string;
  similarity: number;       // cosine similarity score from pgvector (0-1)
  created_at: string;
}

interface CheckInResult {
  summary: string;
  transcript: string;
  mood: string;
  energy: number;
  similarity: number;       // cosine similarity score from pgvector (0-1)
  created_at: string;
}

export interface RelatedContext {
  documentChunks: DocumentChunkResult[];  // matching document sections
  checkIns: CheckInResult[];              // matching past check-ins
  combinedContext: string;                 // formatted text block for LLM injection
}

interface FindRelatedOptions {
  limit?: number;              // max results per source (default 5)
  includeCheckins?: boolean;   // search check_ins embeddings (default true)
  includeDocuments?: boolean;  // search document_chunks embeddings (default true)
  threshold?: number;          // minimum cosine similarity to include (default 0.3)
}

/**
 * Main RAG retrieval function — find health context relevant to a query.
 *
 * @param queryText - Natural language query (e.g., "headache and fatigue", or a check-in summary)
 * @param userId - Scopes search to this user's data only
 * @param options - Control which sources to search and how many results
 * @returns Related context with raw results + formatted combinedContext string
 */
export async function findRelatedContext(
  queryText: string,
  userId: string,
  options?: FindRelatedOptions,
): Promise<RelatedContext> {
  const {
    limit = 5,
    includeCheckins = true,
    includeDocuments = true,
    threshold = 0.3,  // 0.3 is permissive — catches loosely related content
  } = options || {};

  // Step 1: Embed the query text into the same 1024-dim vector space
  // as our stored documents and check-ins
  const queryEmbedding = await embedText(queryText);

  const documentChunks: DocumentChunkResult[] = [];
  const checkIns: CheckInResult[] = [];

  // Step 2a: Search document chunks via pgvector similarity
  // Uses the match_document_chunks() RPC which runs:
  //   SELECT *, 1 - (embedding <=> query_embedding) AS similarity
  //   FROM document_chunks WHERE user_id = ... ORDER BY similarity DESC
  if (includeDocuments) {
    try {
      const { data, error } = await supabase.rpc("match_document_chunks", {
        query_embedding: queryEmbedding,
        match_count: limit,
        filter_user_id: userId,
      });

      if (!error && data) {
        for (const chunk of data) {
          // Skip low-similarity results that would add noise
          if (chunk.similarity < threshold) continue;

          // Enrich chunk with parent document metadata (type, date)
          const { data: doc } = await supabase
            .from("documents")
            .select("document_type, created_at")
            .eq("id", chunk.document_id)
            .single();

          documentChunks.push({
            content: chunk.content,
            document_type: doc?.document_type || "other",
            similarity: chunk.similarity,
            created_at: doc?.created_at || "",
          });
        }
      }
    } catch (err) {
      // Non-fatal: RAG enrichment should never block the main flow
      console.error("[crossReference] Document chunk search failed:", (err as Error).message);
    }
  }

  // Step 2b: Search check-in embeddings via pgvector similarity
  // Uses the match_check_ins() RPC — same approach as document chunks
  if (includeCheckins) {
    try {
      const { data, error } = await supabase.rpc("match_check_ins", {
        query_embedding: queryEmbedding,
        match_count: limit,
        filter_user_id: userId,
      });

      if (!error && data) {
        for (const ci of data) {
          if (ci.similarity < threshold) continue;

          // Fetch full transcript for richer context (RPC only returns summary)
          const { data: fullCheckin } = await supabase
            .from("check_ins")
            .select("transcript")
            .eq("id", ci.id)
            .single();

          checkIns.push({
            summary: ci.summary || "",
            transcript: fullCheckin?.transcript || "",
            mood: ci.mood || "",
            energy: ci.energy || 0,
            similarity: ci.similarity,
            created_at: ci.created_at || "",
          });
        }
      }
    } catch (err) {
      console.error("[crossReference] Check-in search failed:", (err as Error).message);
    }
  }

  // Step 3: Build a combined context string formatted for LLM system prompt injection.
  // Results are sorted by date (newest first) so the AI can reference them naturally
  // with phrases like "your recent blood test" or "last week's check-in".
  const contextParts: string[] = [];

  if (checkIns.length > 0 || documentChunks.length > 0) {
    contextParts.push("RELEVANT HEALTH HISTORY:");
  }

  // Merge both sources into a single chronological list
  const allResults = [
    ...checkIns.map((ci) => ({
      type: "checkin" as const,
      date: ci.created_at,
      text: `Check-in — ${ci.summary} (mood: ${ci.mood}, energy: ${ci.energy}/10)`,
      similarity: ci.similarity,
    })),
    ...documentChunks.map((dc) => ({
      type: "document" as const,
      date: dc.created_at,
      text: `Document (${dc.document_type}) — ${dc.content.slice(0, 200)}`,
      similarity: dc.similarity,
    })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  for (const result of allResults) {
    const dateStr = result.date
      ? new Date(result.date).toLocaleDateString("en-AU", {
          day: "numeric",
          month: "short",
          year: "numeric",
        })
      : "Unknown date";
    contextParts.push(`- [${dateStr}]: ${result.text}`);
  }

  return {
    documentChunks,
    checkIns,
    combinedContext: contextParts.join("\n"),
  };
}
