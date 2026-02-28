/**
 * Document Chunking Service — RAG Component
 *
 * Part of the vector intelligence layer. This service splits medical documents
 * (lab reports, prescriptions, discharge summaries, etc.) into smaller text
 * chunks that can each be independently embedded as 1024-dim vectors via Mistral.
 *
 * Why chunking matters for RAG:
 * - Embedding models have a limited context window (~500 tokens works best)
 * - Smaller chunks produce more focused embeddings, improving similarity search precision
 * - A single medical document can contain many distinct findings (e.g., CBC results,
 *   iron studies, interpretation) — chunking lets us match on specific sections
 *
 * The chunks are stored in the `document_chunks` table and searched via the
 * `match_document_chunks()` pgvector RPC (cosine similarity) in crossReference.ts.
 */

export interface Chunk {
  content: string;
  chunk_index: number;
  total_chunks: number;
  metadata: Record<string, any>;
}

/**
 * Split text into semantic chunks suitable for embedding.
 *
 * Uses a 3-pass hierarchical splitting strategy:
 *   1. Paragraphs (double newline) — preserves natural document structure
 *   2. Lines (single newline) — handles dense sections like lab result tables
 *   3. Sentences — last resort for very long run-on paragraphs
 *
 * After splitting, merges undersized chunks with neighbors (min 400 chars)
 * and adds last-sentence overlap between consecutive chunks for continuity.
 */
export function chunkDocument(
  text: string,
  documentId: string,
  documentType: string,
): Chunk[] {
  // ~500 tokens max per chunk — sweet spot for mistral-embed quality
  const MAX_CHARS = 2000;
  // Minimum chunk size to avoid noisy/low-information embeddings
  const MIN_CHARS = 400;

  // Step 1: split by double newline (paragraphs) — the most natural document boundary
  let rawChunks = text
    .split(/\n\n+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  // Step 2: further split any oversized chunks by single newline
  // (common in lab reports where results are listed line-by-line under one heading)
  rawChunks = rawChunks.flatMap((chunk) => {
    if (chunk.length <= MAX_CHARS) return [chunk];
    return chunk
      .split(/\n/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
  });

  // Step 3: sentence-level splitting as a last resort for very long text blocks
  rawChunks = rawChunks.flatMap((chunk) => {
    if (chunk.length <= MAX_CHARS) return [chunk];
    const sentences = chunk.match(/[^.!?]+[.!?]+\s*/g) || [chunk];
    const result: string[] = [];
    let current = "";
    for (const sentence of sentences) {
      if (current.length + sentence.length > MAX_CHARS && current.length > 0) {
        result.push(current.trim());
        current = "";
      }
      current += sentence;
    }
    if (current.trim()) result.push(current.trim());
    return result;
  });

  // Step 4: merge very small chunks with neighbors to avoid low-quality embeddings
  // (e.g., a single line like "Clinician: Nurse Mary" alone would produce a poor vector)
  const merged: string[] = [];
  let buffer = "";
  for (const chunk of rawChunks) {
    if (buffer.length + chunk.length < MIN_CHARS) {
      buffer += (buffer ? "\n\n" : "") + chunk;
    } else {
      if (buffer) merged.push(buffer);
      buffer = chunk;
    }
  }
  if (buffer) merged.push(buffer);

  // Safety net: if splitting eliminated everything, keep the whole document as one chunk
  if (merged.length === 0 && text.trim()) {
    merged.push(text.trim());
  }

  const totalChunks = merged.length;

  // Step 5: build final Chunk objects with last-sentence overlap
  // Overlap ensures that if a query matches the boundary between two chunks,
  // the relevant context isn't lost. For example, if chunk 1 ends with
  // "Hemoglobin: 11.2 g/dL — LOW" and chunk 2 starts with interpretation,
  // chunk 2 will also contain that hemoglobin line.
  return merged.map((content, i) => {
    let finalContent = content;

    // Prepend the last sentence from the previous chunk for continuity
    if (i > 0) {
      const prevChunk = merged[i - 1];
      const sentences = prevChunk.match(/[^.!?]+[.!?]+/g);
      if (sentences && sentences.length > 0) {
        const lastSentence = sentences[sentences.length - 1].trim();
        finalContent = lastSentence + " " + content;
      }
    }

    return {
      content: finalContent,
      chunk_index: i,
      total_chunks: totalChunks,
      metadata: {
        document_id: documentId,
        document_type: documentType,
        section_hint: content.slice(0, 50), // first 50 chars as a quick preview label
        chunk_index: i,
        total_chunks: totalChunks,
      },
    };
  });
}
