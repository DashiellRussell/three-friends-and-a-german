/**
 * Document Pipeline Service — RAG Ingestion Layer
 *
 * Orchestrates the chunking + embedding pipeline for uploaded medical documents.
 * This is the "write path" of the RAG system:
 *
 *   Upload → summarize + embed whole doc → chunk → embed each chunk → store in document_chunks
 *
 * The whole-document embedding (stored in `documents.embedding`) enables coarse search,
 * while per-chunk embeddings (stored in `document_chunks.embedding`) enable fine-grained
 * retrieval of specific sections (e.g., just the iron studies from a blood test).
 *
 * Called as a fire-and-forget background task from POST /api/documents/upload.
 * Failures are logged but don't block the upload response — the document is still
 * accessible without chunks, just not as precisely searchable.
 */

import { chunkDocument } from "./chunking";
import { embedText } from "./mistral";
import { supabase } from "./supabase";

/**
 * Process a document into chunks, embed each chunk, and store in document_chunks.
 *
 * @param documentId - The UUID of the already-inserted document record
 * @param documentText - The full text content of the document
 * @param documentType - Type classification (lab_report, prescription, imaging, etc.)
 * @returns The number of chunks created
 */
export async function processDocument(
  documentId: string,
  documentText: string,
  documentType: string,
): Promise<number> {
  // Split the document text into semantically meaningful chunks
  // (see chunking.ts for the paragraph → line → sentence splitting strategy)
  const chunks = chunkDocument(documentText, documentId, documentType);

  if (chunks.length === 0) {
    console.log(`[documentPipeline] No chunks generated for document ${documentId}`);
    return 0;
  }

  // Process each chunk sequentially: embed via Mistral, then insert into Supabase.
  // Sequential processing is intentional — avoids rate-limiting the Mistral embeddings API.
  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];

    // Generate a 1024-dim vector for this chunk's content.
    // This vector will be compared against query vectors in match_document_chunks().
    const embedding = await embedText(chunk.content);

    const { error } = await supabase.from("document_chunks").insert({
      document_id: documentId,
      chunk_index: chunk.chunk_index,
      content: chunk.content,
      token_count: Math.ceil(chunk.content.length / 4), // rough char-to-token estimate
      embedding,
      metadata: chunk.metadata,
    });

    if (error) {
      console.error(
        `[documentPipeline] Failed to insert chunk ${i + 1}/${chunks.length} for document ${documentId}:`,
        error.message,
      );
    } else {
      console.log(
        `[documentPipeline] Processed chunk ${i + 1}/${chunks.length} for document ${documentId}`,
      );
    }

    // 150ms delay between Mistral embedding calls to stay within rate limits
    if (i < chunks.length - 1) {
      await new Promise((r) => setTimeout(r, 150));
    }
  }

  return chunks.length;
}
