import { embedText } from "./mistral";
import { supabase } from "./supabase";

interface DocumentChunkResult {
  content: string;
  document_type: string;
  similarity: number;
  created_at: string;
}

interface CheckInResult {
  summary: string;
  transcript: string;
  mood: string;
  energy: number;
  similarity: number;
  created_at: string;
}

export interface RelatedContext {
  documentChunks: DocumentChunkResult[];
  checkIns: CheckInResult[];
  combinedContext: string;
}

interface FindRelatedOptions {
  limit?: number;
  includeCheckins?: boolean;
  includeDocuments?: boolean;
  threshold?: number;
}

/**
 * Find related health context by embedding the query and searching
 * both document chunks and check-ins via pgvector similarity.
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
    threshold = 0.3,
  } = options || {};

  const queryEmbedding = await embedText(queryText);

  const documentChunks: DocumentChunkResult[] = [];
  const checkIns: CheckInResult[] = [];

  // Fetch matching document chunks
  if (includeDocuments) {
    try {
      const { data, error } = await supabase.rpc("match_document_chunks", {
        query_embedding: queryEmbedding,
        match_count: limit,
        filter_user_id: userId,
      });

      if (!error && data) {
        // For each chunk, fetch the parent document's type and created_at
        for (const chunk of data) {
          if (chunk.similarity < threshold) continue;

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
      console.error("[crossReference] Document chunk search failed:", (err as Error).message);
    }
  }

  // Fetch matching check-ins
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

          // Fetch transcript for additional context
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

  // Build combined context string for LLM injection
  const contextParts: string[] = [];

  if (checkIns.length > 0 || documentChunks.length > 0) {
    contextParts.push("RELEVANT HEALTH HISTORY:");
  }

  // Sort all results by date
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
