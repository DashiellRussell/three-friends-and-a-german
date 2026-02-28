export interface Chunk {
  content: string;
  chunk_index: number;
  total_chunks: number;
  metadata: Record<string, any>;
}

/**
 * Split text into semantic chunks suitable for embedding.
 * Strategy: split by paragraph, then by line, then by sentence if still too large.
 * Includes last-sentence overlap between consecutive chunks.
 */
export function chunkDocument(
  text: string,
  documentId: string,
  documentType: string,
): Chunk[] {
  const MAX_CHARS = 2000; // ~500 tokens
  const MIN_CHARS = 400; // ~100 tokens

  // Step 1: split by double newline (paragraphs)
  let rawChunks = text
    .split(/\n\n+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  // Step 2: further split any chunks that are too large by single newline
  rawChunks = rawChunks.flatMap((chunk) => {
    if (chunk.length <= MAX_CHARS) return [chunk];
    return chunk
      .split(/\n/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
  });

  // Step 3: further split by sentences if still too large
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

  // Step 4: merge very small chunks with neighbors
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

  // If we somehow ended up with nothing, just return the whole text as one chunk
  if (merged.length === 0 && text.trim()) {
    merged.push(text.trim());
  }

  const totalChunks = merged.length;

  // Step 5: build chunks with last-sentence overlap
  return merged.map((content, i) => {
    let finalContent = content;

    // Add overlap from previous chunk's last sentence
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
        section_hint: content.slice(0, 50),
        chunk_index: i,
        total_chunks: totalChunks,
      },
    };
  });
}
