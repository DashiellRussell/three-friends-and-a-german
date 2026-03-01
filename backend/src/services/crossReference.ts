/**
 * Cross-Reference Service — RAG Retrieval Layer
 *
 * Two core functions:
 *
 *   1. searchAllByText(query, userId)
 *      Takes a text query, embeds it, searches all 3 vector tables
 *      (check_ins, documents, checkin_chunks), returns top matches
 *      above a similarity threshold.
 *
 *   2. clusterUserData(userId)
 *      Fetches ALL of a user's embeddings across all 3 tables,
 *      compares them pairwise, and groups related entries into clusters.
 *      e.g. "these 3 check-ins + this lab report all relate to anemia"
 *
 * Both use pgvector cosine similarity (1024-dim Mistral embeddings).
 */

import { embedText } from "./mistral";
import { supabase } from "./supabase";

// ══════════════════════════════════════════════════════════════
// Types
// ══════════════════════════════════════════════════════════════

/** Every result carries these base fields regardless of which table it came from */
interface BaseMatch {
  id: string;
  source: "check_in" | "document" | "checkin_chunk";
  similarity: number;
  created_at: string;
  /** One-liner summary suitable for LLM prompt injection */
  displayText: string;
}

export interface CheckInMatch extends BaseMatch {
  source: "check_in";
  summary: string;
  mood: string;
  energy: number;
}

export interface DocumentMatch extends BaseMatch {
  source: "document";
  summary: string;
  document_type: string;
  file_name: string;
}

export interface CheckinChunkMatch extends BaseMatch {
  source: "checkin_chunk";
  content: string;
  check_in_id: string;
}

export type UnifiedMatch = CheckInMatch | DocumentMatch | CheckinChunkMatch;

/** A group of related health entries discovered by clustering */
export interface Cluster {
  /** Auto-generated index (0, 1, 2...) */
  index: number;
  /** All entries in this cluster, sorted by date (newest first) */
  items: EmbeddedEntry[];
}

/** Internal type: a row from any table with its embedding attached */
interface EmbeddedEntry {
  id: string;
  source: "check_in" | "document" | "checkin_chunk";
  created_at: string;
  displayText: string;
  embedding: number[];
}

// ══════════════════════════════════════════════════════════════
// Function 1: searchAllByText
// ══════════════════════════════════════════════════════════════

/**
 * Takes a natural language query, embeds it, and searches all 3 vector
 * tables for matches above a similarity threshold.
 *
 * Example:
 *   const results = await searchAllByText("headache and fatigue", userId);
 *   // → top matches from check_ins, documents, AND checkin_chunks
 *   //   sorted by similarity (best first), all above 0.3
 *
 * @param queryText  - Natural language search query
 * @param userId     - Scope search to this user's data
 * @param options.limit     - Max results per table (default 5, so up to 15 total)
 * @param options.threshold - Min cosine similarity to include (default 0.3)
 */
export async function searchAllByText(
  queryText: string,
  userId: string,
  options?: { limit?: number; threshold?: number },
): Promise<UnifiedMatch[]> {
  const { limit = 5, threshold = 0.3 } = options || {};

  // Step 1: Embed the query into the same 1024-dim vector space
  const embedding = await embedText(queryText);

  // Step 2: Search all 3 tables in parallel (each is non-fatal)
  const [checkIns, documents, chunks] = await Promise.all([
    searchCheckInsRPC(embedding, userId, limit),
    searchDocumentsRPC(embedding, userId, limit),
    searchCheckinChunksRPC(embedding, userId, limit),
  ]);

  // Step 3: Merge, filter by threshold, sort by similarity (best first)
  const all: UnifiedMatch[] = [
    ...checkIns.map(
      (row): CheckInMatch => ({
        id: row.id,
        source: "check_in",
        similarity: row.similarity,
        created_at: row.created_at,
        summary: row.summary || "",
        mood: row.mood || "",
        energy: row.energy || 0,
        displayText: `Check-in — ${row.summary} (mood: ${row.mood}, energy: ${row.energy}/10)`,
      }),
    ),
    ...documents.map(
      (row): DocumentMatch => ({
        id: row.id,
        source: "document",
        similarity: row.similarity,
        created_at: row.created_at,
        summary: row.summary || "",
        document_type: row.document_type || "other",
        file_name: row.file_name || "",
        displayText: `Document (${row.document_type}) — ${(row.summary || row.file_name || "").slice(0, 200)}`,
      }),
    ),
    ...chunks.map(
      (row): CheckinChunkMatch => ({
        id: row.id,
        source: "checkin_chunk",
        similarity: row.similarity,
        created_at: row.created_at,
        content: row.content || "",
        check_in_id: row.check_in_id,
        displayText: `Health event — ${row.content}`,
      }),
    ),
  ];

  return all
    .filter((m) => m.similarity >= threshold)
    .sort((a, b) => b.similarity - a.similarity);
}

// ══════════════════════════════════════════════════════════════
// Function 2: clusterUserData
// ══════════════════════════════════════════════════════════════

/**
 * Fetches ALL of a user's embedded data from all 3 tables, compares
 * every entry against every other entry, and groups related ones
 * into clusters based on cosine similarity.
 *
 * How it works:
 *   1. Pull all rows with embeddings from check_ins, documents, checkin_chunks
 *   2. Compute pairwise cosine similarity between all entries
 *   3. Build a graph: entries are nodes, edges exist where similarity > threshold
 *   4. Find connected components — each component is one cluster
 *
 * Example output:
 *   Cluster 0: [check-in about fatigue, lab report showing low hemoglobin, event: started iron supplements]
 *   Cluster 1: [check-in about migraine, check-in about headache with aura, event: took sumatriptan]
 *   Cluster 2: [check-in about good sleep, check-in about feeling rested]  (unrelated to others)
 *
 * Entries that don't match anything else are returned as single-item clusters.
 *
 * @param userId    - The user whose data to cluster
 * @param threshold - Min cosine similarity to consider two entries "related" (default 0.45)
 *                    Higher = tighter clusters, lower = more things grouped together.
 *                    0.45 works well for health topics (you want "headache" to cluster
 *                    with "migraine" but not with "ate lunch").
 */
export async function clusterUserData(
  userId: string,
  threshold = 0.45,
): Promise<Cluster[]> {
  // Step 1: Fetch all embeddings from all 3 tables
  const entries = await fetchAllEmbeddings(userId);

  if (entries.length === 0) return [];

  // Step 2: Build adjacency list via pairwise cosine similarity.
  // For each pair of entries, if their similarity > threshold, they're connected.
  //
  // Performance note: For N entries this is O(N²) comparisons.
  // With 1024-dim vectors, ~200 entries = ~20K comparisons = ~50ms. Fine.
  // If you ever hit 1000+ entries, consider sampling or batching.
  const adjacency: Map<number, Set<number>> = new Map();

  for (let i = 0; i < entries.length; i++) {
    adjacency.set(i, new Set());
  }

  for (let i = 0; i < entries.length; i++) {
    for (let j = i + 1; j < entries.length; j++) {
      const sim = cosineSimilarity(entries[i].embedding, entries[j].embedding);
      if (sim >= threshold) {
        adjacency.get(i)!.add(j);
        adjacency.get(j)!.add(i);
      }
    }
  }

  // Step 3: Find connected components using BFS.
  // Each connected component = one cluster of related health data.
  const visited = new Set<number>();
  const clusters: Cluster[] = [];
  let clusterIndex = 0;

  for (let i = 0; i < entries.length; i++) {
    if (visited.has(i)) continue;

    // BFS from this node to find all connected entries
    const component: number[] = [];
    const queue = [i];
    visited.add(i);

    while (queue.length > 0) {
      const current = queue.shift()!;
      component.push(current);

      for (const neighbor of adjacency.get(current)!) {
        if (!visited.has(neighbor)) {
          visited.add(neighbor);
          queue.push(neighbor);
        }
      }
    }

    // Sort entries within cluster by date (newest first)
    const items = component
      .map((idx) => entries[idx])
      .sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      );

    clusters.push({ index: clusterIndex++, items });
  }

  // Sort clusters: biggest first (most related entries = most interesting)
  return clusters.sort((a, b) => b.items.length - a.items.length);
}

// ══════════════════════════════════════════════════════════════
// Internal: Supabase RPC wrappers
// ══════════════════════════════════════════════════════════════

async function searchCheckInsRPC(
  embedding: number[],
  userId: string,
  limit: number,
): Promise<any[]> {
  try {
    const { data, error } = await supabase.rpc("match_check_ins", {
      query_embedding: embedding,
      match_count: limit,
      filter_user_id: userId,
    });
    if (error) {
      console.error("[crossReference] match_check_ins failed:", error.message);
      return [];
    }
    return data || [];
  } catch (err) {
    console.error(
      "[crossReference] match_check_ins error:",
      (err as Error).message,
    );
    return [];
  }
}

async function searchDocumentsRPC(
  embedding: number[],
  userId: string,
  limit: number,
): Promise<any[]> {
  try {
    const { data, error } = await supabase.rpc("match_documents", {
      query_embedding: embedding,
      match_count: limit,
      filter_user_id: userId,
    });
    if (error) {
      console.error("[crossReference] match_documents failed:", error.message);
      return [];
    }
    return data || [];
  } catch (err) {
    console.error(
      "[crossReference] match_documents error:",
      (err as Error).message,
    );
    return [];
  }
}

async function searchCheckinChunksRPC(
  embedding: number[],
  userId: string,
  limit: number,
): Promise<any[]> {
  try {
    const { data, error } = await supabase.rpc("match_checkin_chunks", {
      query_embedding: embedding,
      match_count: limit,
      filter_user_id: userId,
    });
    if (error) {
      console.error(
        "[crossReference] match_checkin_chunks failed:",
        error.message,
      );
      return [];
    }
    return data || [];
  } catch (err) {
    console.error(
      "[crossReference] match_checkin_chunks error:",
      (err as Error).message,
    );
    return [];
  }
}

// ══════════════════════════════════════════════════════════════
// Internal: Fetch all embeddings for clustering
// ══════════════════════════════════════════════════════════════

/**
 * Pulls every embedded row from all 3 tables for a given user.
 * Used by clusterUserData() — not for query-based search.
 */
async function fetchAllEmbeddings(userId: string): Promise<EmbeddedEntry[]> {
  const entries: EmbeddedEntry[] = [];

  // Fetch check-ins with embeddings
  try {
    const { data, error } = await supabase
      .from("check_ins")
      .select("id, summary, mood, energy, embedding, created_at")
      .eq("user_id", userId)
      .not("embedding", "is", null);

    if (!error && data) {
      for (const row of data) {
        if (!row.embedding) continue;
        entries.push({
          id: row.id,
          source: "check_in",
          created_at: row.created_at || "",
          displayText: `Check-in — ${row.summary} (mood: ${row.mood}, energy: ${row.energy}/10)`,
          embedding: parseEmbedding(row.embedding),
        });
      }
    }
  } catch (err) {
    console.error(
      "[crossReference] Failed to fetch check-in embeddings:",
      (err as Error).message,
    );
  }

  // Fetch documents with embeddings
  try {
    const { data, error } = await supabase
      .from("documents")
      .select("id, summary, document_type, file_name, embedding, created_at")
      .eq("user_id", userId)
      .not("embedding", "is", null);

    if (!error && data) {
      for (const row of data) {
        if (!row.embedding) continue;
        entries.push({
          id: row.id,
          source: "document",
          created_at: row.created_at || "",
          displayText: `Document (${row.document_type}) — ${(row.summary || row.file_name || "").slice(0, 200)}`,
          embedding: parseEmbedding(row.embedding),
        });
      }
    }
  } catch (err) {
    console.error(
      "[crossReference] Failed to fetch document embeddings:",
      (err as Error).message,
    );
  }

  // Fetch checkin_chunks with embeddings
  try {
    const { data, error } = await supabase
      .from("checkin_chunks")
      .select("id, content, check_in_id, embedding, created_at")
      .eq("user_id", userId)
      .not("embedding", "is", null);

    if (!error && data) {
      for (const row of data) {
        if (!row.embedding) continue;
        entries.push({
          id: row.id,
          source: "checkin_chunk",
          created_at: row.created_at || "",
          displayText: `Health event — ${row.content}`,
          embedding: parseEmbedding(row.embedding),
        });
      }
    }
  } catch (err) {
    console.error(
      "[crossReference] Failed to fetch chunk embeddings:",
      (err as Error).message,
    );
  }

  return entries;
}

// ══════════════════════════════════════════════════════════════
// Internal: Math helpers
// ══════════════════════════════════════════════════════════════

/**
 * Supabase can return pgvector embeddings in different formats depending
 * on the client version — either as a number[] directly or as a string
 * like "[0.1, 0.2, ...]". This handles both.
 */
function parseEmbedding(raw: unknown): number[] {
  if (Array.isArray(raw)) return raw as number[];
  if (typeof raw === "string") {
    try {
      return JSON.parse(raw);
    } catch {
      return [];
    }
  }
  return [];
}

/**
 * Cosine similarity between two vectors.
 * Returns a value between -1 and 1 (1 = identical direction, 0 = unrelated).
 *
 * This is the same metric pgvector uses with the <=> operator, except
 * pgvector returns cosine *distance* (1 - similarity). We return similarity directly.
 */
function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return 0;

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  const denominator = Math.sqrt(normA) * Math.sqrt(normB);
  if (denominator === 0) return 0;

  return dotProduct / denominator;
}
